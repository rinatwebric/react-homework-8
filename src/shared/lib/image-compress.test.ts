import { describe, expect, it } from 'vitest'
import {
  compressImageToJpeg,
  JPEG_QUALITY,
  MAX_PHOTO_BYTES,
  MAX_PHOTO_DIMENSION,
} from './image-compress'

describe('image-compress', () => {
  it('экспортирует корректные константы качества и лимита', () => {
    expect(MAX_PHOTO_DIMENSION).toBe(1280)
    expect(JPEG_QUALITY).toBe(0.8)
    expect(MAX_PHOTO_BYTES).toBe(2 * 1024 * 1024)
  })

  it('отклоняет файл с неверным MIME-типом', async () => {
    const textFile = new File(['hello'], 'test.txt', { type: 'text/plain' })
    await expect(compressImageToJpeg(textFile)).rejects.toThrow(
      'Выбранный файл не является изображением',
    )
  })
})
