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
    const res = await fetch(url, {
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${effectiveToken}`,
        Accept: 'application/json',
      },
    })

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

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })

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
