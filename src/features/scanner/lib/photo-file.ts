/**
 * Проверка выбранного файла до сжатия. Чистые функции без DOM —
 * покрыты тестами (src/features/scanner/lib/photo-file.test.ts).
 */
import {
  ALLOWED_IMAGE_TYPES,
  IMAGE_MAX_DIMENSION,
  IMAGE_MAX_MB,
  UPLOAD_MAX_MB,
  type AllowedImageType,
} from '../../../config/ai'

export type PhotoProblem = 'unsupported_type' | 'too_large'

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)
}

/**
 * Проверяем то, что реально важно на телефоне: HEIC из галереи iPhone придёт
 * как image/heic и должен дать понятную ошибку, а не «не удалось оценить».
 */
export function checkPhoto(file: { type: string; size: number }): PhotoProblem | null {
  if (!isAllowedImageType(file.type)) return 'unsupported_type'
  if (file.size <= 0) return 'unsupported_type'
  if (file.size > UPLOAD_MAX_MB * 1024 * 1024) return 'too_large'
  return null
}

/** Проблема файла → код ошибки интерфейса (ключ scan.errors.*). */
export function photoProblemCode(problem: PhotoProblem): 'FILE_TOO_LARGE' | 'UNSUPPORTED_MEDIA' {
  return problem === 'too_large' ? 'FILE_TOO_LARGE' : 'UNSUPPORTED_MEDIA'
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