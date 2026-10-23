/**
 * Проверка выбранного файла до сжатия. Чистые функции без DOM —
 * покрыты тестами (src/features/scanner/lib/photo-file.test.ts).
 */
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_MAX_DIMENSION,
  IMAGE_MAX_MB,
  SOURCE_MAX_MB,
  UPLOAD_MAX_MB,
  type AllowedImageType,
} from '../../../config/ai'

export type PhotoProblem = 'unsupported_type' | 'source_too_large' | 'not_compressed'

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)
}

/**
 * Проверяем то, что реально важно на телефоне: HEIC из галереи iPhone придёт
 * как image/heic и должен дать понятную ошибку, а не «не удалось оценить».
 *
 * Лимит здесь — размер ДО сжатия (`SOURCE_MAX_MB`): фото с камеры 3–8 МБ должно
 * пройти и уменьшиться на телефоне, а не отбиваться сообщением про 2 МБ.
 */
export function checkPhoto(file: { type: string; size: number }): PhotoProblem | null {
  if (!isAllowedImageType(file.type)) return 'unsupported_type'
  if (file.size <= 0) return 'unsupported_type'
  if (file.size > SOURCE_MAX_MB * 1024 * 1024) return 'source_too_large'
  return null
}

/** Проверка уже сжатого файла перед отправкой: больше 2 МБ Edge Function отклонит (413). */
export function checkCompressed(file: { size: number }): PhotoProblem | null {
  return file.size > UPLOAD_MAX_MB * 1024 * 1024 ? 'not_compressed' : null
}

/** Проблема файла → код ошибки интерфейса (ключ scan.errors.*). */
export function photoProblemCode(
  problem: PhotoProblem,
): 'SOURCE_TOO_LARGE' | 'FILE_TOO_LARGE' | 'UNSUPPORTED_MEDIA' {
  if (problem === 'source_too_large') return 'SOURCE_TOO_LARGE'
  if (problem === 'not_compressed') return 'FILE_TOO_LARGE'
  return 'UNSUPPORTED_MEDIA'
}

/** Параметры сжатия: ≤1 МБ, длинная сторона ≤1280 px, JPEG, EXIF (в т.ч. GPS) не сохраняем. */
export const COMPRESSION_OPTIONS = {
  maxSizeMB: IMAGE_MAX_MB,
  maxWidthOrHeight: IMAGE_MAX_DIMENSION,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
  preserveExif: false,
} as const