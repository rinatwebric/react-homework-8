/**
 * Чтение публичных данных через PostgREST обычным fetch — без @supabase/supabase-js:
 * карте нужны только два GET-запроса, а SDK добавил бы вес основному чанку.
 * В клиенте по-прежнему лишь anon-ключ; что видно — решает RLS на сервере.
 */
import { supabaseConfig } from './supabase'

export class RestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'RestError'
    this.status = status
  }
}

/** Чистая сборка адреса: /rest/v1/<путь>?<параметры>. Проверяется тестом. */
export function restUrlFrom(
  baseUrl: string,
  path: string,
  params: Record<string, string> = {},
): string {
  const base = `${baseUrl.replace(/\/+$/, '')}/rest/v1/${path.replace(/^\/+/, '')}`
  const query = new URLSearchParams(params).toString()
  return query ? `${base}?${query}` : base
}

export function buildRestUrl(path: string, params: Record<string, string> = {}): string {
  if (!supabaseConfig) {
    throw new RestError('Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY', 0)
  }
  return restUrlFrom(supabaseConfig.url, path, params)
}

/**
 * GET к PostgREST. Ответ — unknown: вызывающий валидирует его zod (данные извне).
 * `signal` отменяет запрос при уходе с карты.
 */
export async function restGet(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<unknown> {
  if (!supabaseConfig) {
    throw new RestError('Не заданы VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY', 0)
  }

  const response = await fetch(buildRestUrl(path, params), {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      Accept: 'application/json',
    },
    ...(signal ? { signal } : {}),
  })

  if (!response.ok) {
    throw new RestError(`База ответила ${response.status}`, response.status)
  }

  return (await response.json()) as unknown
}