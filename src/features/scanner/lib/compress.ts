import imageCompression from 'browser-image-compression'
import { COMPRESSION_OPTIONS, checkCompressed } from './photo-file'

/** Вторая попытка — если первая не уложилась в лимит отправки или упала. */
const FALLBACK_OPTIONS = {
  ...COMPRESSION_OPTIONS,
  maxSizeMB: 0.8,
  maxWidthOrHeight: 1024,
  initialQuality: 0.7,
  // Web Worker есть не во всех WebView: там первая попытка падает, вторая идёт в главном потоке.
  useWebWorker: false,
} as const

/**
 * Самый маленький из успешных вариантов; если сжать не удалось — исходник.
 * Чистая функция, покрыта тестами (src/features/scanner/lib/compress.test.ts).
 */
export function pickSmallest<T extends { size: number }>(
  candidates: readonly (T | null)[],
  original: T,
): T {
  let best = original
  for (const candidate of candidates) {
    if (candidate && candidate.size > 0 && candidate.size < best.size) best = candidate
  }
  return best
}

async function tryCompress(file: File, options: typeof COMPRESSION_OPTIONS | typeof FALLBACK_OPTIONS) {
  try {
    return await imageCompression(file, options)
  } catch {
    return null
  }
}

/**
 * Сжатие фото на телефоне: ≤1 МБ, длинная сторона ≤1280 px, JPEG, EXIF удаляется.
 * Снимаем ДО отправки: мобильная сеть медленная, а фотоаппарат даёт 4–8 МБ.
 *
 * Две попытки: обычная (Web Worker) и запасная (без воркера, сильнее сжатие).
 * Возвращаем лучший результат; окончательную проверку ≤2 МБ делает вызывающий код,
 * чтобы не отправить 8 МБ и не получить 413 от функции.
 */
export async function compressPhoto(file: File): Promise<File> {
  const first = await tryCompress(file, COMPRESSION_OPTIONS)
  if (first && !checkCompressed(first)) return first

  const second = await tryCompress(file, FALLBACK_OPTIONS)
  const best = pickSmallest([first, second], file)

  if (checkCompressed(best)) {
    console.error('[scanner] не удалось сжать фото до лимита отправки', best.size)
  }
  return best
}