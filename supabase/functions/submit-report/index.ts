/**
 * Edge Function `submit-report` — срез 2, PR-2 (контракт v2.0).
 *
 * Тело (JSON): SubmitReportRequest из _shared/report-schema.ts.
 * Ответ 200: { id, duplicate } — duplicate=true, если client_id уже был (повтор из очереди).
 *
 * Что делает функция:
 *  1) валидирует тело zod (фото в папке своего client_id, метка ≤ 300 м от GPS);
 *  2) проверяет лимит частоты по device_hash и по хэшу IP;
 *  3) идемпотентно пишет строку в public.reports под service role;
 *  4) возвращает id отчёта.
 *
 * Сдвиг метки сервер считает сам по исходному GPS-фиксу: клиентская проверка 300 м —
 * удобство формы, а не защита (§7.2). Полные координаты и хэши видны только
 * модераторам: anon читает view reports_public (координаты округлены до ~100 м),
 * INSERT у anon нет вовсе.
 *
 * Секреты не нужны: SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY подставляет Edge Runtime.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { jsonResponse, preflightResponse } from '../_shared/cors.ts'
import { ApiError } from '../_shared/errors.ts'
import { distanceMeters } from '../_shared/geo.ts'
import {
  REPORTS_PER_DEVICE_PER_HOUR,
  REPORTS_PER_IP_PER_HOUR,
  submitReportRequestSchema,
  zoneForPoint,
  type SubmitReportRequest,
} from '../_shared/report-schema.ts'
import { sha256Hex } from '../_shared/request.ts'

/** Отчёт с фото — это ~1 КБ JSON; больше 16 КБ точно мусор. */
const MAX_BODY_BYTES = 16 * 1024

type InsertedReport = { id: string }

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new ApiError('NOT_CONFIGURED', 503, 'Нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function readJsonBody(request: Request): Promise<unknown> {
  const raw = await request.text()
  if (raw.length === 0) throw new ApiError('INVALID_INPUT', 400, 'Пустое тело запроса')
  if (raw.length > MAX_BODY_BYTES) {
    throw new ApiError('INVALID_INPUT', 413, 'Тело запроса слишком большое')
  }
  try {
    return JSON.parse(raw)
  } catch {
    throw new ApiError('INVALID_INPUT', 400, 'Тело не является JSON')
  }
}

async function readPayload(request: Request): Promise<SubmitReportRequest> {
  const parsed = submitReportRequestSchema.safeParse(await readJsonBody(request))
  if (!parsed.success) {
    // В лог — только пути полей: тело содержит координаты жителя.
    const paths = parsed.error.issues.map((issue) => issue.path.join('.') || '(root)')
    console.error(`[submit-report] невалидное тело: ${paths.join(', ')}`)
    throw new ApiError('INVALID_INPUT', 400, 'Тело отчёта не прошло проверку')
  }
  return parsed.data
}

/** Первый адрес из X-Forwarded-For: Supabase Edge Runtime ставит его перед прокси. */
function requestIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for') ?? ''
  const first = forwarded.split(',')[0]?.trim()
  if (first) return first
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Хэш IP для лимита частоты. «Перец» обязателен: SHA-256 от IPv4 перебирается
 * по всему адресному пространству за минуты, и хэш стал бы самим адресом.
 * `IP_HASH_SALT` — если задан; иначе берём service_role-ключ (он есть всегда и
 * никогда не попадает в клиент).
 */
async function hashIp(ip: string): Promise<string> {
  const pepper = Deno.env.get('IP_HASH_SALT') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  return sha256Hex(new TextEncoder().encode(`${pepper}:${ip}`))
}

async function countRecentReports(
  client: SupabaseClient,
  column: 'device_hash' | 'ip_hash',
  value: string,
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await client
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .eq(column, value)
    .gte('created_at', since)

  if (error) {
    // Не блокируем жителя из-за сбоя БД: пишем в лог и пропускаем.
    console.error(`[submit-report] лимит не проверен (${column}): ${error.message}`)
    return 0
  }
  return count ?? 0
}

async function enforceRateLimits(
  client: SupabaseClient,
  deviceHash: string,
  ipHash: string,
): Promise<void> {
  if ((await countRecentReports(client, 'device_hash', deviceHash)) >= REPORTS_PER_DEVICE_PER_HOUR) {
    throw new ApiError('RATE_LIMITED', 429, 'Слишком много отчётов с этого устройства за час')
  }
  if ((await countRecentReports(client, 'ip_hash', ipHash)) >= REPORTS_PER_IP_PER_HOUR) {
    throw new ApiError('RATE_LIMITED', 429, 'Слишком много отчётов с этой сети за час')
  }
}

/** Идемпотентная вставка: тот же client_id не создаёт второй отчёт. */
async function insertReport(
  client: SupabaseClient,
  payload: SubmitReportRequest,
  ipHash: string,
): Promise<InsertedReport & { duplicate: boolean }> {
  // Сдвиг считаем сами: клиенту верить нельзя, а CHECK в БД ждёт число ≤ 300.
  const adjustedM = distanceMeters(payload.gps, payload.point)
  const { data, error } = await client
    .from('reports')
    .upsert(
      {
        client_id: payload.client_id,
        // В БД — подтверждённая метка; исходный GPS остаётся в сдвиге и точности.
        lat: payload.point.lat,
        lng: payload.point.lng,
        accuracy_m: payload.gps.accuracy_m,
        // 0,1 м достаточно: значение нужно модератору, а не для расчётов.
        location_adjusted_m: Math.round(adjustedM * 10) / 10,
        zone_id: zoneForPoint(payload.point.lat, payload.point.lng),
        category_user: payload.category,
        comment: payload.comment,
        immediate_danger: payload.immediate_danger,
        weather_snapshot: payload.weather_snapshot,
        photo_path: payload.photo_path,
        device_hash: payload.device_hash,
        ip_hash: ipHash,
      },
      { onConflict: 'client_id', ignoreDuplicates: true },
    )
    .select('id')
    .maybeSingle<InsertedReport>()

  if (error) {
    console.error(`[submit-report] вставка не удалась: ${error.message}`)
    throw new ApiError('SERVER', 500, 'Не удалось сохранить отчёт')
  }
  if (data) return { id: data.id, duplicate: false }

  // ignoreDuplicates: строку не вернули — такой client_id уже есть, отдаём его id.
  const existing = await client
    .from('reports')
    .select('id')
    .eq('client_id', payload.client_id)
    .maybeSingle<InsertedReport>()

  if (existing.error || !existing.data) {
    if (existing.error) console.error(`[submit-report] дубль не найден: ${existing.error.message}`)
    throw new ApiError('SERVER', 500, 'Отчёт не сохранён')
  }
  return { id: existing.data.id, duplicate: true }
}

async function handle(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return preflightResponse()
  if (request.method !== 'POST') {
    throw new ApiError('INVALID_INPUT', 405, 'Поддерживается только POST')
  }

  const payload = await readPayload(request)
  const client = serviceClient()
  // IP открыто не храним: только хэш, чтобы лимит работал и после перезапуска.
  const ipHash = await hashIp(requestIp(request))

  await enforceRateLimits(client, payload.device_hash, ipHash)
  const saved = await insertReport(client, payload, ipHash)

  return jsonResponse({ id: saved.id, duplicate: saved.duplicate })
}

Deno.serve(async (request) => {
  try {
    return await handle(request)
  } catch (error) {
    if (error instanceof ApiError) {
      // В лог — код и текст: ни координат, ни хэшей, ни тела запроса.
      console.error(`[submit-report] ${error.code} ${error.status}: ${error.message}`)
      return jsonResponse({ code: error.code, message: error.message }, error.status)
    }
    console.error(
      `[submit-report] необработанная ошибка: ${error instanceof Error ? error.message : String(error)}`,
    )
    return jsonResponse({ code: 'SERVER', message: 'Внутренняя ошибка функции' }, 500)
  }
})