/**
 * Клиент Edge Function `submit-report`: JSON-fetch, таймаут, разбор ошибок.
 * Ошибки нормализуются в один тип с кодом — экран показывает текст
 * из src/locales/ru.json → report.errors.*.
 */
import { SUBMIT_TIMEOUT_MS } from '../../../config/report'
import { edgeFunctionUrl, supabaseConfig } from '../../../shared/lib/supabase'
import {
  submitReportResponseSchema,
  type SubmitReportRequest,
  type SubmitReportResponse,
} from '../../../shared/types/report-contract'

export type SubmitReportErrorCode =
  | 'NOT_CONFIGURED'
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'NETWORK'
  | 'TIMEOUT'

const KNOWN_CODES: readonly SubmitReportErrorCode[] = [
  'NOT_CONFIGURED',
  'INVALID_INPUT',
  'RATE_LIMITED',
  'SERVER',
]

const STATUS_TO_CODE: Record<number, SubmitReportErrorCode> = {
  400: 'INVALID_INPUT',
  401: 'NOT_CONFIGURED',
  403: 'NOT_CONFIGURED',
  404: 'SERVER',
  405: 'INVALID_INPUT',
  413: 'INVALID_INPUT',
  429: 'RATE_LIMITED',
}

export class SubmitReportError extends Error {
  readonly code: SubmitReportErrorCode

  constructor(code: SubmitReportErrorCode, message: string) {
    super(message)
    this.name = 'SubmitReportError'
    this.code = code
  }
}

function isKnownCode(value: string | undefined): value is SubmitReportErrorCode {
  return typeof value === 'string' && (KNOWN_CODES as readonly string[]).includes(value)
}

function readServerError(body: unknown): { code?: string; message?: string } {
  if (typeof body !== 'object' || body === null) return {}
  const code = 'code' in body && typeof body.code === 'string' ? body.code : undefined
  const message = 'message' in body && typeof body.message === 'string' ? body.message : undefined
  return { code, message }
}

/** Ответ функции с ошибкой → типизированная ошибка клиента. Чистая функция. */
export function mapSubmitFailure(status: number, body: unknown): SubmitReportError {
  const { code, message } = readServerError(body)
  const fallback: SubmitReportErrorCode =
    STATUS_TO_CODE[status] ?? (status >= 500 ? 'SERVER' : 'INVALID_INPUT')
  return new SubmitReportError(
    isKnownCode(code) ? code : fallback,
    message ?? 'Не удалось отправить отчёт',
  )
}

/** Успешный ответ функции → id отчёта. Чистая функция. */
export function parseSubmitResponse(body: unknown): SubmitReportResponse {
  const parsed = submitReportResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new SubmitReportError('SERVER', 'Неожиданный формат ответа сервера')
  }
  return parsed.data
}

export async function submitReport(
  payload: SubmitReportRequest,
  signal?: AbortSignal,
): Promise<SubmitReportResponse> {
  if (!supabaseConfig) {
    throw new SubmitReportError(
      'NOT_CONFIGURED',
      'Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY',
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  signal?.addEventListener('abort', forwardAbort)

  try {
    const response = await fetch(edgeFunctionUrl('submit-report'), {
      method: 'POST',
      headers: {
        apikey: supabaseConfig.anonKey,
        Authorization: `Bearer ${supabaseConfig.anonKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) throw mapSubmitFailure(response.status, body)
    return parseSubmitResponse(body)
  } catch (error) {
    if (error instanceof SubmitReportError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SubmitReportError(
        signal?.aborted ? 'NETWORK' : 'TIMEOUT',
        signal?.aborted ? 'Отправка отменена' : 'Сервер не ответил вовремя',
      )
    }
    throw new SubmitReportError('NETWORK', 'Нет связи с сервером')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forwardAbort)
  }
}