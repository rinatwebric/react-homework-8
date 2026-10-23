import imageCompression from 'browser-image-compression'
import { COMPRESSION_OPTIONS } from './photo-file'

/**
 * Сжатие фото на телефоне: ≤1 МБ, длинная сторона ≤1280 px, JPEG, EXIF удаляется.
 * Снимаем ДО отправки: мобильная сеть медленная, а фотоаппарат даёт 4–8 МБ.
 */
export async function compressPhoto(file: File): Promise<File> {
  try {
    return await imageCompression(file, COMPRESSION_OPTIONS)
  } catch {
    // Web Worker или Canvas могут быть недоступны (старый WebView) — отправляем как есть.
    // Размер и MIME всё равно проверит Edge Function.
    console.error('[scanner] сжатие не удалось, отправляем исходный файл')
    return file
  }
}