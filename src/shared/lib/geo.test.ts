import { describe, expect, it } from 'vitest'
import {
  distanceMeters,
  formatAccuracy,
  roundForPublic,
  roundPointForPublic,
} from './geo'

describe('geo: публичные координаты', () => {
  it('округляет до 3 знаков, как генерируемые колонки БД', () => {
    expect(roundForPublic(42.34793)).toBe(42.348)
    expect(roundForPublic(76.1669)).toBe(76.167)
    expect(roundForPublic(0.0004)).toBe(0)
  })

  it('не трогает уже округлённые значения', () => {
    expect(roundForPublic(42.348)).toBe(42.348)
  })

  it('округляет точку целиком', () => {
    expect(roundPointForPublic({ lat: 42.34793, lng: 76.1669 })).toEqual({
      lat: 42.348,
      lng: 76.167,
    })
  })
})

describe('geo: расстояние', () => {
  it('между одинаковыми точками — ноль', () => {
    expect(distanceMeters({ lat: 42.348, lng: 76.167 }, { lat: 42.348, lng: 76.167 })).toBe(0)
  })

  it('0.001° по широте — около 111 м', () => {
    const meters = distanceMeters({ lat: 42.348, lng: 76.167 }, { lat: 42.349, lng: 76.167 })
    expect(meters).toBeGreaterThan(110)
    expect(meters).toBeLessThan(112)
  })

  it('сдвиг на 1° по долготе на экваторе — около 111 км', () => {
    const meters = distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })
    expect(meters).toBeGreaterThan(111_000)
    expect(meters).toBeLessThan(111_500)
  })
})

describe('geo: подпись точности', () => {
  it('округляет до целых метров', () => {
    expect(formatAccuracy(11.6)).toBe('±12 м')
  })

  it('не показывает «±0 м» — минимум 1 м', () => {
    expect(formatAccuracy(0.2)).toBe('±1 м')
  })
})