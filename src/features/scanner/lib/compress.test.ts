import { describe, expect, it } from 'vitest'
import { pickSmallest } from './compress'

const MB = 1024 * 1024

describe('compress: выбор лучшего варианта сжатия', () => {
  it('берёт самый маленький успешный вариант', () => {
    const original = { size: 6 * MB }
    expect(pickSmallest([{ size: 900 * 1024 }, { size: 400 * 1024 }], original)).toEqual({
      size: 400 * 1024,
    })
  })

  it('игнорирует неудачные попытки (null)', () => {
    const original = { size: 6 * MB }
    expect(pickSmallest([null, { size: 700 * 1024 }], original)).toEqual({ size: 700 * 1024 })
  })

  it('если сжать не удалось — возвращает исходник, чтобы вызывающий код показал ошибку', () => {
    const original = { size: 6 * MB }
    expect(pickSmallest([null, null], original)).toBe(original)
  })

  it('не выбирает «сжатие», которое вышло больше оригинала', () => {
    const original = { size: 300 * 1024 }
    expect(pickSmallest([{ size: 900 * 1024 }], original)).toBe(original)
  })

  it('не выбирает пустой файл', () => {
    const original = { size: 6 * MB }
    expect(pickSmallest([{ size: 0 }], original)).toBe(original)
  })
})