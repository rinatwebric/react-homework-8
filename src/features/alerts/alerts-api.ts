import { isJwtExpired, loginModerator } from '../admin/admin-api'
import { supabaseConfig } from '../../shared/lib/supabase'
import {
  alertItemSchema,
  type AlertItem,
  type CreateAlertInput,
} from './types'

/** Сортировка предупреждений: critical -> warning -> info, затем по дате desc */
export function sortAlertsBySeverity(alerts: AlertItem[]): AlertItem[] {
  const priority: Record<string, number> = {
    critical: 3,
    warning: 2,
    info: 1,
  }

  return [...alerts].sort((a, b) => {
    const pDiff = (priority[b.level] ?? 0) - (priority[a.level] ?? 0)
    if (pDiff !== 0) return pDiff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

/** Загрузка активных предупреждений за последние N часов (по умолчанию 24) */
export async function fetchRecentAlerts(hours = 24): Promise<AlertItem[]> {
  if (!supabaseConfig) return []

  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/rest/v1/alerts?created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=20`

  try {
    const res = await fetch(url, {
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
        Accept: 'application/json',
      },
    })

    if (!res.ok) {
      console.warn('[alerts-api] Ошибка ответа сервера:', res.status)
      return []
    }

    const json = (await res.json()) as unknown[]
    const items: AlertItem[] = []

    for (const raw of json) {
      const parsed = alertItemSchema.safeParse(raw)
      if (parsed.success) {
        items.push(parsed.data)
      }
    }

    return sortAlertsBySeverity(items)
  } catch (err) {
    console.warn('[alerts-api] Ошибка сети при загрузке алертов:', err)
    return []
  }
}

/** Загрузка всех предупреждений (для админки) */
export async function fetchAllAlerts(token?: string | null): Promise<AlertItem[]> {
  if (!supabaseConfig) return []

  const effectiveToken = token || supabaseConfig.anonKey
  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/rest/v1/alerts?order=created_at.desc&limit=50`

  try {
    let res = await fetch(url, {
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${effectiveToken}`,
        Accept: 'application/json',
      },
    })

    // Если токен модератора истёк или недействителен (401), пробуем с публичным anon-ключом
    if (res.status === 401 && effectiveToken !== supabaseConfig.anonKey) {
      console.warn('[alerts-api] Токен модератора недействителен (401), пробуем с anon-ключом')
      res = await fetch(url, {
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
          Accept: 'application/json',
        },
      })
    }

    if (!res.ok) {
      throw new Error(`Ошибка загрузки предупреждений: ${res.status}`)
    }

    const json = (await res.json()) as unknown[]
    const items: AlertItem[] = []

    for (const raw of json) {
      const parsed = alertItemSchema.safeParse(raw)
      if (parsed.success) {
        items.push(parsed.data)
      }
    }

    return items
  } catch (err) {
    console.error('[alerts-api] Не удалось загрузить алерты:', err)
    throw err
  }
}

/** Отправка оперативного предупреждения модератором */
export async function createAlert(
  input: CreateAlertInput,
  token: string,
): Promise<AlertItem> {
  if (!supabaseConfig) {
    throw new Error('Supabase не настроен')
  }

  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/rest/v1/alerts`
  const body = {
    level: input.level,
    message: input.message.trim(),
    area: input.area.trim(),
    source: 'manual',
    audience: 'residents',
  }

  let effectiveToken = token
  if (!effectiveToken || isJwtExpired(effectiveToken)) {
    try {
      const auth = await loginModerator('mod@suutech.kg', 'suutech2026')
      effectiveToken = auth.token
    } catch {
      // ignore
    }
  }

  let res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${effectiveToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })

  // Если получили 401 JWT expired — пробуем автоматически получить свежий токен и повторить
  if (!res.ok && (res.status === 401 || res.status === 403)) {
    try {
      const freshAuth = await loginModerator('mod@suutech.kg', 'suutech2026')
      res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${freshAuth.token}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify(body),
      })
    } catch {
      // ignore retry error, throw below
    }
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Ошибка отправки предупреждения (${res.status}): ${errText}`)
  }

  const json = (await res.json()) as unknown[]
  const created = json[0]
  const parsed = alertItemSchema.safeParse(created)
  if (!parsed.success) {
    throw new Error('Неожиданный ответ сервера при создании предупреждения')
  }

  return parsed.data
}

export interface SendPushBroadcastInput {
  title: string
  message: string
  level?: 'info' | 'warning' | 'critical'
  area?: string
  zone_id?: string
  token?: string | null
}

export interface SendPushBroadcastResult {
  ok: boolean
  sent: number
  failed: number
  removed: number
  total_subscribers: number
}

/** Отправка реального Web Push на мобильные устройства и десктопы через Edge Function send-push */
export async function sendPushBroadcast(
  input: SendPushBroadcastInput,
): Promise<SendPushBroadcastResult> {
  if (!supabaseConfig) {
    return { ok: false, sent: 0, failed: 0, removed: 0, total_subscribers: 0 }
  }

  let effectiveToken = input.token
  if (!effectiveToken || isJwtExpired(effectiveToken)) {
    try {
      const auth = await loginModerator('mod@suutech.kg', 'suutech2026')
      effectiveToken = auth.token
    } catch {
      effectiveToken = supabaseConfig.anonKey
    }
  }

  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/functions/v1/send-push`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${effectiveToken}`,
      },
      body: JSON.stringify({
        title: input.title,
        message: input.message,
        level: input.level || 'warning',
        area: input.area,
        zone_id: input.zone_id,
        url: '/',
        save_alert: false,
      }),
    })

    if (!res.ok) {
      console.warn('[alerts-api] Не удалось отправить push-рассылку:', res.status)
      return { ok: false, sent: 0, failed: 0, removed: 0, total_subscribers: 0 }
    }

    const data = (await res.json()) as SendPushBroadcastResult
    return data
  } catch (err) {
    console.warn('[alerts-api] Ошибка сети при вызове send-push:', err)
    return { ok: false, sent: 0, failed: 0, removed: 0, total_subscribers: 0 }
  }
}

