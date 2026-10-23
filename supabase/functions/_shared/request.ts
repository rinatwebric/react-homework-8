/**
 * Разбор и проверка запроса `analyze-photo`.
 * Всё, что приходит извне (форма, клиент), проверяется zod и магическими байтами:
 * заголовку Content-Type не верим, MIME определяем по содержимому файла.
 */
import { z } from 'npm:zod@4.6.7'
import { ApiError } from './errors.ts'

export const APP_LANGS = ['ru', 'ky'] as const
export type AppLang = (typeof APP_LANGS)[number]

export const SCAN_MODES = ['resident', 'farmer'] as const
export type ScanMode = (typeof SCAN_MODES)[number]

/** Совпадает с лимитом бакета report-photos в миграции среза 0. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
/** Стартовый лимит: 12 новых фото в час с одного client_id (калибруется на пилоте). */
export const RATE_LIMIT_PER_HOUR = 12

const clientIdSchema = z.uuid()
const langSchema = z.enum(['ru', 'ky'])
const modeSchema = z.enum(['resident', 'farmer'])

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp'

export type PhotoRequest = {
  clientId: string
  lang: AppLang
  mode: ScanMode
  bytes: Uint8Array
  mime: ImageMime
}

function parseClientId(value: unknown): string {
  const parsed = clientIdSchema.safeParse(typeof value === 'string' ? value.trim() : value)
  if (!parsed.success) {
    throw new ApiError('INVALID_INPUT', 400, 'client_id должен быть UUID')
  }
  return parsed.data
}

function parseLang(value: unknown): AppLang {
  const parsed = langSchema.safeParse(value ?? 'ru')
  return parsed.success ? parsed.data : 'ru'
}

function parseMode(value: unknown): ScanMode {
  const parsed = modeSchema.safeParse(value ?? 'resident')
  return parsed.success ? parsed.data : 'resident'
}

function startsWith(bytes: Uint8Array, signature: readonly number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  return signature.every((byte, index) => bytes[offset + index] === byte)
}

/**
 * MIME по магическим байтам: клиент может прислать что угодно с любым заголовком.
 * null — не изображение поддерживаемого формата.
 */
export function detectImageMime(bytes: Uint8Array): ImageMime | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'image/webp'
  }
  return null
}

/** SHA-256 содержимого фото: ключ кэша оценок. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function readPhotoRequest(request: Request): Promise<PhotoRequest> {
  const contentType = request.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    throw new ApiError('INVALID_INPUT', 400, 'Ожидается multipart/form-data с полем file')
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    throw new ApiError('INVALID_INPUT', 400, 'Не удалось разобрать форму')
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    throw new ApiError('INVALID_INPUT', 400, 'В поле file нет изображения')
  }
  if (file.size === 0) {
    throw new ApiError('INVALID_INPUT', 400, 'Пустой файл')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError('FILE_TOO_LARGE', 413, 'Файл больше 2 МБ — сожмите фото на клиенте')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  const mime = detectImageMime(bytes)
  if (!mime) {
    throw new ApiError('UNSUPPORTED_MEDIA', 415, 'Поддерживаются JPEG, PNG и WebP')
  }

  return {
    clientId: parseClientId(form.get('client_id')),
    lang: parseLang(form.get('lang')),
    mode: parseMode(form.get('mode')),
    bytes,
    mime,
  }
}