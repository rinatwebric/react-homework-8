/**
 * Гео-хелперы, общие для формы отчёта (срез 2) и карты.
 *
 * Округление на клиенте — только для подписи идёт «≈100 м»: публичность координат
 * обеспечивает БД (генерируемые колонки lat_public/lng_public, миграция среза 0),
 * а не этот файл.
 */

export type LatLng = { lat: number; lng: number }

/** 3 знака ≈ 111 м по широте и ≈ 82 м по долготе на широте Иссык-Куля — как в БД. */
export const PUBLIC_COORD_DECIMALS = 3

const EARTH_RADIUS_M = 6_371_000

const toRad = (degrees: number) => (degrees * Math.PI) / 180

/** Округление до публичной точности (~100 м). */
export function roundForPublic(value: number): number {
  const factor = 10 ** PUBLIC_COORD_DECIMALS
  return Math.round(value * factor) / factor
}

export function roundPointForPublic(point: LatLng): LatLng {
  return { lat: roundForPublic(point.lat), lng: roundForPublic(point.lng) }
}

/** Расстояние по большому кругу, метры. Нужна чистой: тест держит точность. */
export function distanceMeters(from: LatLng, to: LatLng): number {
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Человеческая точность GPS для подписи: «±12 м». */
export function formatAccuracy(accuracyM: number): string {
  return `±${Math.max(1, Math.round(accuracyM))} м`
}

/** Азимут от `from` к `to` в градусах (0…360). Нужен, чтобы сдвинуть точку по лучу. */
export function bearingDegrees(from: LatLng, to: LatLng): number {
  const fromLat = toRad(from.lat)
  const toLat = toRad(to.lat)
  const dLng = toRad(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(toLat)
  const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng)
  return (((Math.atan2(y, x) * 180) / Math.PI) % 360 + 360) % 360
}

/** Точка на расстоянии `meters` по азимуту `bearing` — обратная к distanceMeters. */
export function destinationPoint(origin: LatLng, bearing: number, meters: number): LatLng {
  const angular = meters / EARTH_RADIUS_M
  const originLat = toRad(origin.lat)
  const originLng = toRad(origin.lng)
  const bearingRad = toRad(bearing)

  const lat = Math.asin(
    Math.sin(originLat) * Math.cos(angular) +
      Math.cos(originLat) * Math.sin(angular) * Math.cos(bearingRad),
  )
  const lng =
    originLng +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angular) * Math.cos(originLat),
      Math.cos(angular) - Math.sin(originLat) * Math.sin(lat),
    )

  return {
    lat: (lat * 180) / Math.PI,
    // Долгота могла уехать за ±180° — приводим к диапазону.
    lng: ((((lng * 180) / Math.PI + 540) % 360) - 180),
  }
}

/**
 * Точка заявки не дальше `maxMeters` от GPS (ТЗ v2.0 §7.2): метку можно уточнить
 * в пределах 300 м, но не «переставить» на другой конец страны. Внутри радиуса
 * возвращаем точку как есть — округления нет.
 *
 * Это первый из трёх уровней проверки: UI → `submit-report` (сервер считает сдвиг
 * сам) → CHECK в БД.
 */
export function clampPointToRadius(origin: LatLng, target: LatLng, maxMeters: number): LatLng {
  if (!(maxMeters > 0)) return origin

  const distance = distanceMeters(origin, target)
  if (distance <= maxMeters) return target

  const bearing = bearingDegrees(origin, target)
  // Цель совпала с началом: азимут не определён, оставляем точку на месте.
  if (Number.isNaN(bearing)) return origin
  return destinationPoint(origin, bearing, maxMeters)
}