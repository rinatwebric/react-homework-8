/**
 * Принадлежность точки зоне — чистые функции с тестами.
 *
 * Зачем: `reports.zone_id` в базе — слаг пилота (`kg-issyk-ton-ak-olong`), а ключ
 * `zone_risk.zone_id` и границ — `shapeID` из geoBoundaries. Сопоставлять их строками
 * нельзя, поэтому отчёты раскладываются по зонам геометрией (луч, rule of ray casting).
 */
import { zoneIdOf, type ZoneCollection, type ZoneFeature } from './zone-geojson'

type Position = [number, number, ...number[]]

/** Луч из точки вправо: нечётное число пересечений кольца — точка внутри. */
function ringContains(ring: Position[], lng: number, lat: number): boolean {
  let inside = false

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i]
    const previous = ring[j]
    if (!current || !previous) continue

    const [currentLng, currentLat] = current
    const [previousLng, previousLat] = previous

    const crossesLatitude = currentLat > lat !== previousLat > lat
    if (!crossesLatitude) continue

    const crossLng =
      ((previousLng - currentLng) * (lat - currentLat)) / (previousLat - currentLat) + currentLng
    if (lng < crossLng) inside = !inside
  }

  return inside
}

/** Полигон с дырками: внутри внешнего кольца и не внутри ни одной дырки. */
function polygonContains(polygon: Position[][], lng: number, lat: number): boolean {
  const [outer, ...holes] = polygon
  if (!outer || !ringContains(outer, lng, lat)) return false
  return !holes.some((hole) => ringContains(hole, lng, lat))
}

export function featureContains(feature: ZoneFeature, lng: number, lat: number): boolean {
  const geometry = feature.geometry
  if (geometry.type === 'Polygon') return polygonContains(geometry.coordinates, lng, lat)
  return geometry.coordinates.some((polygon) => polygonContains(polygon, lng, lat))
}

/** Зона точки: сначала ищем в переданных коллекциях, порядок важен только для одиночного поиска. */
export function findZoneId(
  lng: number,
  lat: number,
  collections: readonly ZoneCollection[],
): string | null {
  for (const collection of collections) {
    for (const feature of collection.features) {
      if (featureContains(feature, lng, lat)) return zoneIdOf(feature)
    }
  }

  return null
}

type LocatedReport = { lat_public: number; lng_public: number }

/**
 * Сколько отчётов попало в каждую зону. Точка может одновременно лежать в области и в
 * районе, поэтому счётчики уровней считаются независимо (внутри коллекции — первый матч).
 */
export function countReportsByZone(
  reports: readonly LocatedReport[],
  collections: readonly ZoneCollection[],
): Map<string, number> {
  const counts = new Map<string, number>()

  for (const report of reports) {
    for (const collection of collections) {
      const zone = collection.features.find((feature) =>
        featureContains(feature, report.lng_public, report.lat_public),
      )
      if (!zone) continue

      const id = zoneIdOf(zone)
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }

  return counts
}