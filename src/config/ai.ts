/**
 * Параметры AI-сканера (срез 1).
 * Сжатие делаем на телефоне: мобильный интернет медленный, а бакет принимает до 2 МБ.
 */
export const IMAGE_MAX_MB = 1
export const IMAGE_MAX_DIMENSION = 1280
/** Лимит бакета report-photos (совпадает с миграцией среза 0). */
export const UPLOAD_MAX_MB = 2
/** Ниже этого порога уверенности просим переснять: на демо такие фото выглядят неубедительно. */
export const LOW_CONFIDENCE = 0.5
/** Клиентский таймаут: функция держит модель до 25 с, плюс сеть и загрузка фото. */
export const ANALYZE_TIMEOUT_MS = 45_000

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]