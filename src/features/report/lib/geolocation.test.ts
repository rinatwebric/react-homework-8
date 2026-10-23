import { describe, expect, it } from 'vitest'
import { geoErrorCode, pickBetterFix, readFix, type GeoFix } from './geolocation'

describe('geolocation: коды ошибок', () => {
  it('переводит коды GeolocationPositionError', () => {
    expect(geoErrorCode(1)).toBe('PERMISSION_DENIED')
    expect(geoErrorCode(2)).toBe('POSITION_UNAVAILABLE')
    expect(geoErrorCode(3)).toBe('TIMEOUT')
  })

  it('неизвестный код считает «не удалось определить»', () => {
    expect(geoErrorCode(99)).toBe('POSITION_UNAVAILABLE')
  })
})

describe('geolocation: чтение фикса', () => {
  it('берёт координаты и точность', () => {
    const fix = readFix(
      { coords: { latitude: 42.3479, longitude: 76.1669, accuracy: 12.5 } },
      1_700_000_000_000,
    )
    expect(fix).toEqual({ lat: 42.3479, lng: 76.1669, accuracyM: 12.5, at: 1_700_000_000_000 })
  })

  it('NaN в точности превращает в 0, а не в мусор на экране', () => {
    const fix = readFix({ coords: { latitude: 42.3, longitude: 76.1, accuracy: Number.NaN } })
    expect(fix.accuracyM).toBe(0)
  })
})

describe('geolocation: выбор лучшего измерения', () => {
  const coarse: GeoFix = { lat: 42.3, lng: 76.1, accuracyM: 120, at: 1 }
  const precise: GeoFix = { lat: 42.31, lng: 76.11, accuracyM: 18, at: 2 }

  it('первый фикс становится текущим', () => {
    expect(pickBetterFix(null, coarse)).toBe(coarse)
  })

  it('более точный фикс заменяет текущий', () => {
    expect(pickBetterFix(coarse, precise)).toBe(precise)
  })

  it('более грубый фикс игнорируется', () => {
    expect(pickBetterFix(precise, coarse)).toBe(precise)
  })
})