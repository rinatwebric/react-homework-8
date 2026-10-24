import { z } from 'npm:zod@4.6.7'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

const subscribePushSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  area_lat: z.number().min(-90).max(90).optional().nullable(),
  area_lng: z.number().min(-180).max(180).optional().nullable(),
  zone_id: z.string().optional().nullable(),
  lang: z.enum(['ru', 'ky']).default('ru'),
})

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return preflightResponse()

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST supported' }, 405)
  }

  try {
    const rawBody = await req.json()
    const parsed = subscribePushSchema.safeParse(rawBody)
    if (!parsed.success) {
      return jsonResponse({ error: 'INVALID_INPUT', issues: parsed.error.issues }, 400)
    }

    const { subscription, area_lat, area_lng, zone_id, lang } = parsed.data

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      return jsonResponse({ error: 'SERVER_MISCONFIGURED', message: 'Missing service key' }, 500)
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    })

    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          area_lat: area_lat !== undefined && area_lat !== null ? Number(area_lat.toFixed(2)) : null,
          area_lng: area_lng !== undefined && area_lng !== null ? Number(area_lng.toFixed(2)) : null,
          zone_id: zone_id || null,
          lang: lang || 'ru',
        },
        { onConflict: 'endpoint' },
      )
      .select('id')
      .single()

    if (error) {
      console.error('[subscribe-push] Ошибка записи подписки:', error)
      return jsonResponse({ error: 'DATABASE_ERROR', message: error.message }, 500)
    }

    return jsonResponse({ ok: true, id: data?.id })
  } catch (err) {
    console.error('[subscribe-push] Ошибка обработки запроса:', err)
    return jsonResponse({ error: 'SERVER_ERROR', message: String(err) }, 500)
  }
})
