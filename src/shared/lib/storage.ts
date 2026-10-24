/**
 * Загрузка файлов в Supabase Storage (REST API).
 */
import { supabaseConfig } from './supabase'

/**
 * Получение публичной ссылки на фотографию заявки в бакете `report-photos`.
 */
export function getReportPhotoUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath || !supabaseConfig) return null
  const cleanPath = photoPath.replace(/^\/+/, '')
  return `${supabaseConfig.url.replace(/\/+$/, '')}/storage/v1/object/public/report-photos/${cleanPath}`
}

/**
 * Загружает сжатое фото в бакет `report-photos`.
 * Путь создаётся строго в папке `client_id` (например `${clientId}/photo-${Date.now()}.jpg`),
 * что удовлетворяет CHECK-констрейнту `reports_photo_belongs_to_client`.
 */
export async function uploadReportPhoto(
  clientId: string,
  file: Blob,
  extension = 'jpg',
): Promise<string> {
  if (!supabaseConfig) {
    throw new Error('Конфигурация Supabase недоступна')
  }

  const fileName = `photo-${Date.now()}.${extension}`
  const objectPath = `${clientId}/${fileName}`
  const url = `${supabaseConfig.url.replace(/\/+$/, '')}/storage/v1/object/report-photos/${objectPath}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: file,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[storage] ошибка загрузки фото:', response.status, errorText)
    throw new Error(`Ошибка загрузки фото: ${response.status}`)
  }

  return objectPath
}
