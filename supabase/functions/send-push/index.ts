import { z } from 'npm:zod@4.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'
import * as webpush from 'jsr:@negrel/webpush@^0.5.0'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}

// VAPID keys для отправки Web Push (P-256)
const VAPID_KEYS = {
  publicKey: {
    crv: 'P-256',
    kty: 'EC',
    x: 'MtU6aaFn0ugLSXwQ4Uo8iPe_0dc4qFjr69m7XQcXpLc',
    y: '2beI3ZqcOWjgtpfjLGBNl3L2Rs_2NNJeFW9TaXB1Or8',
    ext: true,
  },
  privateKey: {
    crv: 'P-256',
    kty: 'EC',
    x: 'MtU6aaFn0ugLSXwQ4Uo8iPe_0dc4qFjr69m7XQcXpLc',
    y: '2beI3ZqcOWjgtpfjLGBNl3L2Rs_2NNJeFW9TaXB1Or8',
    d: 'IapA1XdJ4X4fdJ9jcy7cR3ZULGcNoCELOq-RmEs2MJc',
    ext: true,
  },
}

const sendPushSchema = z.object({
  title: z.string().min(1).max(100),
  message: z.string().min(1).max(500),
  level: z.enum(['info', 'warning', 'critical']).default('warning'),
  area: z.string().max(100).optional(),
  zone_id: z.string().optional(),
  url: z.string().default('/'),
  save_alert: z.boolean().default(false),
})

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflightResponse()

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST supported' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return jsonResponse({ error: 'SERVER_MISCONFIGURED', message: 'Missing supabase keys' }, 500)
    }

    // Проверка авторизации: модератор или service_role
    const authHeader = req.headers.get('authorization') || ''
    let isAuthorized = false
    let moderatorUserId: string | null = null

    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '').trim()
      if (token === supabaseServiceKey) {
        isAuthorized = true
      } else {
        const authClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false },
          global: { headers: { Authorization: authHeader } },
        })
        const { data: { user } } = await authClient.auth.getUser()
        if (user) {
          const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { persistSession: false },
          })
          const { data: modRow } = await supabaseAdmin
            .from('moderators')
            .select('user_id')
            .eq('user_id', user.id)
            .maybeSingle()
          if (modRow) {
            isAuthorized = true
            moderatorUserId = user.id
          }
        }
      }
    }

    if (!isAuthorized) {
      return jsonResponse({ error: 'FORBIDDEN', message: 'Only moderators can send push alerts' }, 403)
    }

    const rawBody = await req.json()
    const parsed = sendPushSchema.safeParse(rawBody)
    if (!parsed.success) {
      return jsonResponse({ error: 'INVALID_INPUT', issues: parsed.error.issues }, 400)
    }

    const { title, message, level, area, zone_id, url, save_alert } = parsed.data

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    // Опционально сохраняем в alerts (если вызвано не после прямой вставки)
    if (save_alert) {
      await supabaseAdmin.from('alerts').insert({
        level,
        message,
        area: area || null,
        zone_id: zone_id || null,
        source: 'manual',
        audience: 'residents',
        created_by: moderatorUserId,
      })
    }

    // Загрузка подписок
    let query = supabaseAdmin.from('push_subscriptions').select('id, endpoint, keys, zone_id')
    if (zone_id) {
      query = query.or(`zone_id.is.null,zone_id.eq.${zone_id}`)
    }
    const { data: subscriptions, error: subError } = await query

    if (subError) {
      console.error('[send-push] Ошибка чтения push_subscriptions:', subError)
      return jsonResponse({ error: 'DATABASE_ERROR', message: subError.message }, 500)
    }

    const totalSubscribers = subscriptions?.length || 0
    if (totalSubscribers === 0) {
      return jsonResponse({
        ok: true,
        sent: 0,
        failed: 0,
        removed: 0,
        total_subscribers: 0,
        message: 'No subscribers registered',
      })
    }

    // Инициализация Web Push
    let appServer: webpush.ApplicationServer
    try {
      const importedKeys = await webpush.importVapidKeys(VAPID_KEYS)
      appServer = await webpush.ApplicationServer.new({
        contactInformation: Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@suutech.kg',
        vapidKeys: importedKeys,
      })
    } catch (vapidErr) {
      console.error('[send-push] Ошибка инициализации VAPID keys:', vapidErr)
      return jsonResponse({ error: 'VAPID_INIT_ERROR', message: String(vapidErr) }, 500)
    }

    const payloadString = JSON.stringify({
      title,
      body: `${area ? `[${area}] ` : ''}${message}`,
      message,
      level,
      area,
      url,
      tag: `suutech-alert-${Date.now()}`,
    })
    let sent = 0
    let failed = 0
    let removed = 0
    const errors: string[] = []

    // Отправка пачками по 20
    const BATCH_SIZE = 20
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      const batch = subscriptions.slice(i, i + BATCH_SIZE)
      await Promise.all(
        batch.map(async (sub) => {
          try {
            const rawKeys = sub.keys
            const keys = typeof rawKeys === 'string' ? JSON.parse(rawKeys) : rawKeys
            if (!keys?.p256dh || !keys?.auth) {
              throw new Error('Subscription missing p256dh or auth keys')
            }

            const subscriber = appServer.subscribe({
              endpoint: sub.endpoint,
              keys: {
                p256dh: keys.p256dh,
                auth: keys.auth,
              },
            })

            await subscriber.pushTextMessage(payloadString, {
              urgency: level === 'critical' ? 'high' : 'normal',
              ttl: 86400,
            })
            sent++
          } catch (err: unknown) {
            failed++
            const errStr = String((err as { message?: string })?.message || err)
            errors.push(errStr)
            console.error(`[send-push] Push failed for ${sub.endpoint}:`, errStr)
            // При 404/410 или unregistered/expired удаляем мёртвую подписку
            if (
              errStr.includes('404') ||
              errStr.includes('410') ||
              errStr.includes('unregistered') ||
              errStr.includes('expired')
            ) {
              await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
              removed++
            }
          }
        }),
      )
    }

    return jsonResponse({
      ok: true,
      sent,
      failed,
      removed,
      total_subscribers: totalSubscribers,
      errors: errors.slice(0, 5),
    })
  } catch (err) {
    console.error('[send-push] Ошибка выполнения:', err)
    return jsonResponse({ error: 'SERVER_ERROR', message: String(err) }, 500)
  }
})
