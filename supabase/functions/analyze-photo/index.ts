/**
 * Edge Function `analyze-photo` — срез 1.
 *
 * Фото (multipart: file, client_id, lang, mode) → проверка → кэш по SHA-256 →
 * vision-модель → zod-валидация → сохранение фото и оценки.
 *
 * Ответ 200: { assessment, photo_path, model, cached, contract_version }
 * Ошибки: { code, message } с кодами из _shared/errors.ts.
 *
 * Секреты: VISION_API_KEY, VISION_MODEL (секреты функции).
 * SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY подставляет сам Supabase Edge Runtime.
 * Ключ модели не покидает функцию и не попадает в клиент.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { CONTRACT_VERSION, assessmentSchema } from '../_shared/ai-contract.ts'
import { jsonResponse, preflightResponse } from '../_shared/cors.ts'
import { ApiError } from '../_shared/errors.ts'
import {
  RATE_LIMIT_PER_HOUR,
  readPhotoRequest,
  sha256Hex,
  type PhotoRequest,
} from '../_shared/request.ts'
import { assessPhoto, type VisionOutput } from '../_shared/vision.ts'

/** Бакет из миграции среза 0: публичное чтение по неугадываемому пути. */
const BUCKET = 'report-photos'

type CachedAssessment = {
  assessment: unknown
  storage_path: string | null
  model: string | null
}

function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    throw new ApiError('NOT_CONFIGURED', 503, 'Нет SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

async function findCached(client: SupabaseClient, sha256: string): Promise<CachedAssessment | null> {
  const { data, error } = await client
    .from('photo_assessments')
    .select('assessment, storage_path, model')
    .eq('sha256', sha256)
    .eq('status', 'ok')
    .maybeSingle<CachedAssessment>()

  if (error) {
    // Кэш — оптимизация: если БД недоступна, просто идём в модель.
    console.error(`[analyze-photo] кэш недоступен: ${error.message}`)
    return null
  }
  return data ?? null
}

/**
 * Лимит частоты: считаем все обращения за последний час, включая неудачные,
 * иначе спам невалидными фото был бы бесплатным.
 */
async function enforceRateLimit(client: SupabaseClient, clientId: string): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error } = await client
    .from('photo_assessments')
    .select('sha256', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .gte('created_at', since)

  if (error) {
    console.error(`[analyze-photo] лимит не проверен: ${error.message}`)
    return
  }
  if ((count ?? 0) >= RATE_LIMIT_PER_HOUR) {
    throw new ApiError('RATE_LIMITED', 429, 'Слишком много фото за час, попробуйте позже')
  }
}

async function uploadPhoto(
  client: SupabaseClient,
  photo: PhotoRequest,
  sha256: string,
): Promise<string | null> {
  // Путь: reports/{client_id}/{первые 12 символов хэша}.jpg — предсказуемо связан с отчётом,
  // но не угадывается (client_id — UUID клиента). EXIF снят на клиенте до загрузки.
  const path = `reports/${photo.clientId}/${sha256.slice(0, 12)}.jpg`
  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, new Blob([photo.bytes], { type: photo.mime }), {
      contentType: photo.mime,
      upsert: true,
    })

  if (error) {
    // Оценка важнее картинки: фото не загрузилось — отдаём результат без пути.
    console.error(`[analyze-photo] фото не загружено: ${error.message}`)
    return null
  }
  return path
}
async function rememberAssessment(
  client: SupabaseClient,
  photo: PhotoRequest,
  sha256: string,
  payload: { assessment: unknown; model: string; storagePath: string | null },
): Promise<void> {
  const { error } = await client.from('photo_assessments').upsert(
    {
      sha256,
      client_id: photo.clientId,
      status: 'ok',
      assessment: payload.assessment,
      storage_path: payload.storagePath,
      model: payload.model,
      lang: photo.lang,
      mode: photo.mode,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'sha256' },
  )

  if (error) console.error(`[analyze-photo] оценка не закэширована: ${error.message}`)
}

/** Неудачное обращение тоже фиксируем: оно учитывается в лимите частоты. */
async function rememberFailure(
  client: SupabaseClient,
  photo: PhotoRequest,
  sha256: string,
  status: 'ai_invalid' | 'ai_timeout',
): Promise<void> {
  const { error } = await client.from('photo_assessments').upsert(
    {
      sha256,
      client_id: photo.clientId,
      status,
      assessment: null,
      lang: photo.lang,
      mode: photo.mode,
    },
    { onConflict: 'sha256', ignoreDuplicates: true },
  )

  if (error) console.error(`[analyze-photo] неудача не записана: ${error.message}`)
}

async function handle(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return preflightResponse()
  if (request.method !== 'POST') {
    throw new ApiError('INVALID_INPUT', 405, 'Поддерживается только POST')
  }

  const photo = await readPhotoRequest(request)
  const client = serviceClient()
  const sha256 = await sha256Hex(photo.bytes)

  // Кэш: тот же файл не отправляем в модель повторно (на демо повторный снимок отвечает мгновенно).
  const cached = await findCached(client, sha256)
  if (cached) {
    const parsed = assessmentSchema.safeParse(cached.assessment)
    if (parsed.success) {
      return jsonResponse({
        assessment: parsed.data,
        photo_path: cached.storage_path,
        model: cached.model,
        cached: true,
        contract_version: CONTRACT_VERSION,
      })
    }
    console.error('[analyze-photo] в кэше невалидная оценка — идём в модель')
  }

  await enforceRateLimit(client, photo.clientId)

  let vision: VisionOutput
  try {
    vision = await assessPhoto({
      bytes: photo.bytes,
      mimeType: photo.mime,
      lang: photo.lang,
      mode: photo.mode,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      const status = error.code === 'AI_TIMEOUT' ? 'ai_timeout' : 'ai_invalid'
      await rememberFailure(client, photo, sha256, status)
    }
    throw error
  }

  const photoPath = await uploadPhoto(client, photo, sha256)
  await rememberAssessment(client, photo, sha256, {
    assessment: vision.assessment,
    model: vision.model,
    storagePath: photoPath,
  })

  return jsonResponse({
    assessment: vision.assessment,
    photo_path: photoPath,
    model: vision.model,
    cached: false,
    contract_version: CONTRACT_VERSION,
  })
}

Deno.serve(async (request) => {
  try {
    return await handle(request)
  } catch (error) {
    if (error instanceof ApiError) {
      // В лог — код и текст, без base64 фото и без ключа.
      console.error(`[analyze-photo] ${error.code} ${error.status}: ${error.message}`)
      return jsonResponse({ code: error.code, message: error.message }, error.status)
    }
    console.error(
      `[analyze-photo] необработанная ошибка: ${error instanceof Error ? error.message : String(error)}`,
    )
    return jsonResponse({ code: 'SERVER', message: 'Внутренняя ошибка функции' }, 500)
  }
})