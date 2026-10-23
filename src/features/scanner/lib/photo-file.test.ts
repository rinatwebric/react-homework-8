import { describe, expect, it } from 'vitest'
import { SOURCE_MAX_MB, UPLOAD_MAX_MB } from '../../../config/ai'
import {
  COMPRESSION_OPTIONS,
  checkCompressed,
  checkPhoto,
  isAllowedImageType,
  photoProblemCode,
} from './photo-file'

const MB = 1024 * 1024

describe('photo-file: проверка файла до сжатия', () => {
  it('принимает JPEG в пределах лимита', () => {
    expect(checkPhoto({ type: 'image/jpeg', size: 1024 })).toBeNull()
    expect(checkPhoto({ type: 'image/webp', size: 2 * MB })).toBeNull()
  })

  it('пропускает фото с камеры 4–8 МБ — они должны сжиматься, а не отбиваться', () => {
    expect(checkPhoto({ type: 'image/jpeg', size: 4 * MB })).toBeNull()
    expect(checkPhoto({ type: 'image/jpeg', size: 8 * MB })).toBeNull()
    expect(checkPhoto({ type: 'image/jpeg', size: SOURCE_MAX_MB * MB })).toBeNull()
  })

  it('отклоняет HEIC из галереи iPhone понятной ошибкой', () => {
    expect(checkPhoto({ type: 'image/heic', size: 1024 })).toBe('unsupported_type')
  })

  it('отклоняет исходник больше 30 МБ', () => {
    expect(checkPhoto({ type: 'image/jpeg', size: SOURCE_MAX_MB * MB + 1 })).toBe('source_too_large')
  })

  it('отклоняет пустой файл', () => {
    expect(checkPhoto({ type: 'image/png', size: 0 })).toBe('unsupported_type')
  })

  it('переводит проблему в код ошибки интерфейса', () => {
    expect(photoProblemCode('source_too_large')).toBe('SOURCE_TOO_LARGE')
    expect(photoProblemCode('not_compressed')).toBe('FILE_TOO_LARGE')
    expect(photoProblemCode('unsupported_type')).toBe('UNSUPPORTED_MEDIA')
  })

  it('знает разрешённые MIME', () => {
    expect(isAllowedImageType('image/png')).toBe(true)
    expect(isAllowedImageType('application/pdf')).toBe(false)
  })
})

describe('photo-file: проверка после сжатия (лимит бакета)', () => {
  it('сжатый файл до 2 МБ проходит', () => {
    expect(checkCompressed({ size: 300 * 1024 })).toBeNull()
    expect(checkCompressed({ size: UPLOAD_MAX_MB * MB })).toBeNull()
  })

  it('сжатый файл больше 2 МБ не отправляем — сервер ответил бы 413', () => {
    expect(checkCompressed({ size: UPLOAD_MAX_MB * MB + 1 })).toBe('not_compressed')
  })
})

describe('photo-file: параметры сжатия', () => {
  it('1 МБ, 1280 px, без EXIF', () => {
    expect(COMPRESSION_OPTIONS.maxSizeMB).toBe(1)
    expect(COMPRESSION_OPTIONS.maxWidthOrHeight).toBe(1280)
    expect(COMPRESSION_OPTIONS.preserveExif).toBe(false)
    expect(COMPRESSION_OPTIONS.fileType).toBe('image/jpeg')
  })

  it('лимит отправки меньше лимита исходника — иначе сжатие не имеет смысла', () => {
    expect(UPLOAD_MAX_MB).toBeLessThan(SOURCE_MAX_MB)
  })
})