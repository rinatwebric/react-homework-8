import { describe, expect, it } from 'vitest'
import { MAX_LOCATION_ADJUST_M } from '../types/report-contract'
import {
  bearingDegrees,
  clampPointToRadius,
  destinationPoint,
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

describe('geo: азимут и точка по лучу', () => {
  it('на север и на восток — 0° и 90°', () => {
    expect(bearingDegrees({ lat: 42.348, lng: 76.167 }, { lat: 42.358, lng: 76.167 })).toBeCloseTo(0, 1)
    expect(bearingDegrees({ lat: 42.348, lng: 76.167 }, { lat: 42.348, lng: 76.177 })).toBeCloseTo(90, 1)
  })

  it('на юг и на запад — 180° и 270°', () => {
    expect(bearingDegrees({ lat: 42.348, lng: 76.167 }, { lat: 42.338, lng: 76.167 })).toBeCloseTo(180, 1)
    expect(bearingDegrees({ lat: 42.348, lng: 76.167 }, { lat: 42.348, lng: 76.157 })).toBeCloseTo(270, 1)
  })

  it('всегда в диапазоне 0…360', () => {
    const bearing = bearingDegrees({ lat: 42.348, lng: 76.167 }, { lat: 42.3481, lng: 76.1671 })
    expect(bearing).toBeGreaterThanOrEqual(0)
    expect(bearing).toBeLessThan(360)
  })

  it('destinationPoint обратна distanceMeters', () => {
    const origin = { lat: 42.348, lng: 76.167 }
    const target = destinationPoint(origin, 45, 250)
    expect(distanceMeters(origin, target)).toBeCloseTo(250, 0)
    expect(bearingDegrees(origin, target)).toBeCloseTo(45, 0)
  })

  it('ноль метров — та же точка', () => {
    const origin = { lat: 42.348, lng: 76.167 }
    const same = destinationPoint(origin, 123, 0)
    expect(distanceMeters(origin, same)).toBeCloseTo(0, 5)
  })
})

describe('geo: радиус 300 м для метки заявки', () => {
  const gps = { lat: 42.348, lng: 76.167 }

  it('точка внутри радиуса остаётся как есть', () => {
    const point = { lat: 42.3485, lng: 76.1675 }
    expect(clampPointToRadius(gps, point, MAX_LOCATION_ADJUST_M)).toEqual(point)
  })

  it('точку за радиусом притягивает ровно к границе', () => {
    const far = destinationPoint(gps, 90, 1_000)
    const clamped = clampPointToRadius(gps, far, MAX_LOCATION_ADJUST_M)
    expect(distanceMeters(gps, clamped)).toBeCloseTo(MAX_LOCATION_ADJUST_M, 0)
    // Направление сохраняется: сдвиг по тому же лучу.
    expect(bearingDegrees(gps, clamped)).toBeCloseTo(90, 0)
  })

  it('на самой границе точку не двигает', () => {
    const edge = destinationPoint(gps, 200, MAX_LOCATION_ADJUST_M)
    const clamped = clampPointToRadius(gps, edge, MAX_LOCATION_ADJUST_M)
    expect(distanceMeters(gps, clamped)).toBeLessThanOrEqual(MAX_LOCATION_ADJUST_M + 0.001)
  })

  it('нечисловой радиус — возвращает исходную точку', () => {
    const far = destinationPoint(gps, 10, 5_000)
    expect(clampPointToRadius(gps, far, 0)).toEqual(gps)
  })
})