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