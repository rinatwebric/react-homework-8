import { ANALYZE_TIMEOUT_MS } from '../../../config/ai'
import { edgeFunctionUrl, supabaseConfig } from '../../../shared/lib/supabase'
import {
  analyzeResponseSchema,
  type Assessment,
} from '../../../shared/types/ai-contract'

/**
 * Клиент `analyze-photo`: fetch + FormData.
 * Ошибки нормализуются в один тип с кодом, по которому экран показывает
 * понятный текст (src/locales/ru.json → scan.errors.*).
 */
export type AnalyzeErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_INPUT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA'
  | 'RATE_LIMITED'
  | 'AI_INVALID'
  | 'AI_TIMEOUT'
  | 'SERVER'
  | 'NETWORK'
  | 'TIMEOUT'

const KNOWN_CODES: readonly AnalyzeErrorCode[] = [
  'NOT_CONFIGURED',
  'INVALID_INPUT',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_MEDIA',
  'RATE_LIMITED',
  'AI_INVALID',
  'AI_TIMEOUT',
  'SERVER',
]

const STATUS_TO_CODE: Record<number, AnalyzeErrorCode> = {
  400: 'INVALID_INPUT',
  401: 'NOT_CONFIGURED',
  403: 'NOT_CONFIGURED',
  404: 'SERVER',
  405: 'INVALID_INPUT',
  413: 'FILE_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA',
  429: 'RATE_LIMITED',
  502: 'AI_INVALID',
  504: 'AI_TIMEOUT',
}

export class AnalyzeError extends Error {
  code: AnalyzeErrorCode

  constructor(code: AnalyzeErrorCode, message: string) {
    super(message)
    this.name = 'AnalyzeError'
    this.code = code
  }
}

export type AnalyzeResult = {
  assessment: Assessment
  photoPath: string | null
  model: string | null
  cached: boolean
}

function isKnownCode(value: string | undefined): value is AnalyzeErrorCode {
  return typeof value === 'string' && (KNOWN_CODES as readonly string[]).includes(value)
}

function readServerError(body: unknown): { code?: string; message?: string } {
  if (typeof body !== 'object' || body === null) return {}
  const code = 'code' in body && typeof body.code === 'string' ? body.code : undefined
  const message = 'message' in body && typeof body.message === 'string' ? body.message : undefined
  return { code, message }
}

/** Ответ функции с ошибкой → типизированная ошибка клиента. Чистая функция. */
export function mapFailure(status: number, body: unknown): AnalyzeError {
  const { code, message } = readServerError(body)
  const fallback: AnalyzeErrorCode =
    STATUS_TO_CODE[status] ?? (status >= 500 ? 'SERVER' : 'INVALID_INPUT')
  return new AnalyzeError(isKnownCode(code) ? code : fallback, message ?? 'Не удалось получить оценку')
}

/** Успешный ответ функции → данные для экрана. Чистая функция. */
export function parseAnalyzeResponse(body: unknown): AnalyzeResult {
  const parsed = analyzeResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new AnalyzeError('AI_INVALID', 'Неожиданный формат ответа сервера')
  }
  return {
    assessment: parsed.data.assessment,
    photoPath: parsed.data.photo_path,
    model: parsed.data.model,
    cached: parsed.data.cached,
  }
}

export type AnalyzePhotoInput = {
  file: File
  clientId: string
  lang?: 'ru' | 'ky'
  mode?: 'resident' | 'farmer'
  /** Внешняя отмена (например, уход с экрана). */
  signal?: AbortSignal
}

export async function analyzePhoto({
  file,
  clientId,
  lang = 'ru',
  mode = 'resident',
  signal,
}: AnalyzePhotoInput): Promise<AnalyzeResult> {
  if (!supabaseConfig) {
    throw new AnalyzeError(
      'NOT_CONFIGURED',
      'Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY',
    )
  }

  const form = new FormData()
  form.append('file', file, file.name || 'photo.jpg')
  form.append('client_id', clientId)
  form.append('lang', lang)
  form.append('mode', mode)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)

  try {
    const response = await fetch(edgeFunctionUrl('analyze-photo'), {
      method: 'POST',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
        Accept: 'application/json',
      },
      body: form,
      signal: controller.signal,
    })

    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) throw mapFailure(response.status, body)
    return parseAnalyzeResponse(body)
  } catch (error) {
    if (error instanceof AnalyzeError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AnalyzeError(
        signal?.aborted ? 'NETWORK' : 'TIMEOUT',
        signal?.aborted ? 'Запрос отменён' : 'Сервер не ответил вовремя',
      )
    }
    throw new AnalyzeError('NETWORK', 'Нет связи с сервером')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}