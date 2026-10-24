/**
 * Коды ошибок Edge Functions. Клиент показывает по ним понятный текст,
 * поэтому набор фиксирован (удалённые коды не переиспользуем).
 */
export type ApiErrorCode =
  | 'INVALID_INPUT'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA'
  | 'RATE_LIMITED'
  | 'AI_INVALID'
  | 'AI_TIMEOUT'
  | 'NOT_CONFIGURED'
  | 'SERVER'

export class ApiError extends Error {
  code: ApiErrorCode
  status: number

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}