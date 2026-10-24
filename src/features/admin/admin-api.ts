import { edgeFunctionUrl, supabaseConfig } from '../../shared/lib/supabase'
import type {
  ReportStatus,
  ReportStatusHistoryRow,
  ReportWithTriage,
} from '../../shared/types/database'
import type { TriageResult } from '../../shared/types/triage-contract'

const STORAGE_TOKEN_KEY = 'suutech_moderator_token'
const STORAGE_EMAIL_KEY = 'suutech_moderator_email'

export function getStoredModeratorToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_TOKEN_KEY)
  } catch {
    return null
  }
}

export function getStoredModeratorEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_EMAIL_KEY)
  } catch {
    return null
  }
}

export function storeModeratorSession(token: string, email: string): void {
  try {
    localStorage.setItem(STORAGE_TOKEN_KEY, token)
    localStorage.setItem(STORAGE_EMAIL_KEY, email)
  } catch {
    // игнорируем ошибку storage в приватном режиме
  }
}

export function clearModeratorSession(): void {
  try {
    localStorage.removeItem(STORAGE_TOKEN_KEY)
    localStorage.removeItem(STORAGE_EMAIL_KEY)
  } catch {
    // ignore
  }
}

/** Авторизация модератора через Supabase Auth (GoTrue REST) */
export async function loginModerator(email: string, password: string): Promise<{ token: string; email: string }> {
  if (!supabaseConfig) {
    throw new Error('Supabase не настроен')
  }

  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/auth/v1/token?grant_type=password`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim(), password: password.trim() }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { error_description?: string; msg?: string }
    throw new Error(errorData.error_description || errorData.msg || `Ошибка входа: ${response.status}`)
  }

  const data = (await response.json()) as { access_token: string; user?: { email?: string } }
  const token = data.access_token
  const userEmail = data.user?.email ?? email

  storeModeratorSession(token, userEmail)
  return { token, email: userEmail }
}

/** Фолбек на публичное представление для режима гостя/просмотра */
async function fetchPublicReportsFallback(): Promise<ReportWithTriage[]> {
  if (!supabaseConfig) return []

  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/rest/v1/reports_public?order=created_at.desc`
  const res = await fetch(url, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      Accept: 'application/json',
    },
  })

  if (!res.ok) {
    throw new Error(`Ошибка загрузки заявок: ${res.status}`)
  }

  const data = (await res.json()) as unknown[]
  return data.map((item) => {
    const r = item as Record<string, unknown>
    return {
      ...r,
      client_id: (r.id as string) || '',
      lat: (r.lat_public as number) ?? null,
      lng: (r.lng_public as number) ?? null,
      location_adjusted_m: null,
      created_by: null,
      moderator_note: null,
      device_hash: null,
      ip_hash: null,
      ai_triage: null,
    } as ReportWithTriage
  })
}

/** Загрузка заявок со связанным AI-триажем */
export async function fetchAdminReports(token?: string | null): Promise<ReportWithTriage[]> {
  if (!supabaseConfig) {
    throw new Error('Supabase не настроен')
  }

  const storedToken = getStoredModeratorToken()
  const effectiveToken = token || storedToken

  // Если токена нет — загружаем публичные данные без ошибки
  if (!effectiveToken) {
    return fetchPublicReportsFallback()
  }

  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/rest/v1/reports?select=*,ai_triage(*)&order=created_at.desc`

  const response = await fetch(url, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${effectiveToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    // Если сессия недействительна (401/403) — сбрасываем и загружаем публичные
    if (response.status === 401 || response.status === 403) {
      clearModeratorSession()
      return fetchPublicReportsFallback()
    }
    throw new Error(`Ошибка загрузки заявок: ${response.status}`)
  }

  const data = (await response.json()) as unknown[]

  return data.map((item) => {
    const record = item as Record<string, unknown>
    let triageObj = record.ai_triage
    if (Array.isArray(triageObj)) {
      triageObj = triageObj[0] ?? null
    }

    return {
      ...record,
      ai_triage: triageObj ?? null,
    } as ReportWithTriage
  })
}

/** Смена статуса и заметки модератора */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  note: string | null,
  token?: string | null,
): Promise<void> {
  if (!supabaseConfig) {
    throw new Error('Supabase не настроен')
  }

  const effectiveToken = token || getStoredModeratorToken() || supabaseConfig.anonKey
  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/rest/v1/reports?id=eq.${reportId}`

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${effectiveToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      status,
      moderator_note: note,
    }),
  })

  if (!response.ok) {
    throw new Error(`Ошибка обновления статуса: ${response.status}`)
  }
}

/** Загрузка истории переходов статуса для заявки */
export async function fetchReportHistory(
  reportId: string,
  token?: string | null,
): Promise<ReportStatusHistoryRow[]> {
  if (!supabaseConfig) {
    return []
  }

  const effectiveToken = token || getStoredModeratorToken() || supabaseConfig.anonKey
  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/rest/v1/report_status_history?report_id=eq.${reportId}&order=created_at.desc`

  const response = await fetch(url, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${effectiveToken}`,
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    console.warn('[admin-api] Ошибка загрузки истории статусов:', response.status)
    return []
  }

  return (await response.json()) as ReportStatusHistoryRow[]
}

/** Запуск AI-триажа заявки через Edge Function classify-report */
export async function triggerAiTriage(
  reportId: string,
  lang: 'ru' | 'ky' = 'ru',
  token?: string | null,
): Promise<TriageResult> {
  if (!supabaseConfig) {
    throw new Error('Supabase не настроен')
  }

  const effectiveToken = token || getStoredModeratorToken() || supabaseConfig.anonKey
  const url = edgeFunctionUrl('classify-report')

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${effectiveToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ report_id: reportId, lang }),
  })

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(errorData.message || `Ошибка запуска AI-триажа: ${response.status}`)
  }

  const data = (await response.json()) as { triage: TriageResult }
  return data.triage
}
