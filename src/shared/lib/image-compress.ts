/**
 * Сжатие фото на клиенте перед отправкой в Supabase Storage.
 *
 * Требования ТЗ (§7, §14):
 * - Удаление EXIF-метаданных (геолокация и данные устройства с камеры удаляются через Canvas);
 * - Уменьшение разрешения: длинная сторона ≤ 1280 px;
 * - Формат: JPEG, качество 0.8 (размер фото с 4–10 МБ падает до ~150–350 КБ);
 * - Лимит бакета: 2 МБ (2 097 152 байт);
 * - Без тяжелых внешних библиотек (нативный HTML5 Canvas).
 */

export const MAX_PHOTO_DIMENSION = 1280
export const JPEG_QUALITY = 0.8
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024 // 2 МБ

export async function compressImageToJpeg(
  file: File,
  maxDimension = MAX_PHOTO_DIMENSION,
  quality = JPEG_QUALITY,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Проверка MIME
    if (!file.type.startsWith('image/')) {
      reject(new Error('Выбранный файл не является изображением'))
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Не удалось декодировать изображение'))
      img.onload = () => {
        let { width, height } = img

        // Вычисляем масштаб с сохранением пропорций
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Не удалось инициализировать canvas'))
          return
        }

        // Перерисовка на Canvas удаляет все EXIF/метатеги
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Ошибка при сжатии в JPEG'))
              return
            }
            if (blob.size > MAX_PHOTO_BYTES) {
              reject(new Error('Размер фото даже после сжатия превышает 2 МБ'))
              return
            }
            resolve(blob)
          },
          'image/jpeg',
          quality,
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
