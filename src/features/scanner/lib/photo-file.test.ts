import { describe, expect, it } from 'vitest'
import {
  COMPRESSION_OPTIONS,
  checkPhoto,
  isAllowedImageType,
  photoProblemCode,
} from './photo-file'

describe('photo-file: проверка файла до сжатия', () => {
  it('принимает JPEG в пределах лимита', () => {
    expect(checkPhoto({ type: 'image/jpeg', size: 1024 })).toBeNull()
    expect(checkPhoto({ type: 'image/webp', size: 2 * 1024 * 1024 })).toBeNull()
  })

  it('отклоняет HEIC из галереи iPhone понятной ошибкой', () => {
    expect(checkPhoto({ type: 'image/heic', size: 1024 })).toBe('unsupported_type')
  })

  it('отклоняет файл больше 2 МБ (лимит бакета)', () => {
    expect(checkPhoto({ type: 'image/jpeg', size: 2 * 1024 * 1024 + 1 })).toBe('too_large')
  })

  it('отклоняет пустой файл', () => {
    expect(checkPhoto({ type: 'image/png', size: 0 })).toBe('unsupported_type')
  })

  it('переводит проблему в код ошибки интерфейса', () => {
    expect(photoProblemCode('too_large')).toBe('FILE_TOO_LARGE')
    expect(photoProblemCode('unsupported_type')).toBe('UNSUPPORTED_MEDIA')
  })

  it('знает разрешённые MIME', () => {
    expect(isAllowedImageType('image/png')).toBe(true)
    expect(isAllowedImageType('application/pdf')).toBe(false)
  })
})

describe('photo-file: параметры сжатия', () => {
  it('1 МБ, 1280 px, без EXIF', () => {
    expect(COMPRESSION_OPTIONS.maxSizeMB).toBe(1)
    expect(COMPRESSION_OPTIONS.maxWidthOrHeight).toBe(1280)
    expect(COMPRESSION_OPTIONS.preserveExif).toBe(false)
    expect(COMPRESSION_OPTIONS.fileType).toBe('image/jpeg')
  })
})