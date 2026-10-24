/**
 * Гео-хелперы Edge Functions — серверная сторона.
 *
 * ⚠️ Копия формулы из src/shared/lib/geo.ts (Deno не может импортировать код
 * приложения). Сервер считает сдвиг метки сам: клиентская проверка 300 м — это
 * удобство формы, а не защита (§7.2). Точность держит тест src/shared/lib/geo.test.ts.
 */

export type LatLng = { lat: number; lng: number }

const EARTH_RADIUS_M = 6_371_000

const toRad = (degrees: number) => (degrees * Math.PI) / 180

/** Расстояние по большому кругу, метры. */
export function distanceMeters(from: LatLng, to: LatLng): number {
  const dLat = toRad(to.lat - from.lat)
  const dLng = toRad(to.lng - from.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}