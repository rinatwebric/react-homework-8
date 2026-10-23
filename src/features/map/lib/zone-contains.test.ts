import { describe, expect, it } from 'vitest'
import type { ZoneCollection, ZoneFeature } from './zone-geojson'
import { countReportsByZone, featureContains, findZoneId } from './zone-contains'

type Ring = [number, number][]

function feature(
  id: string,
  geometry:
    | { type: 'Polygon'; coordinates: Ring[] }
    | { type: 'MultiPolygon'; coordinates: Ring[][] },
  shapeType: 'ADM1' | 'ADM2' = 'ADM2',
): ZoneFeature {
  return {
    type: 'Feature',
    properties: { shapeID: id, shapeName: id, shapeType },
    geometry,
  }
}

function square(minX: number, minY: number, maxX: number, maxY: number): Ring {
  return [
    [minX, minY],
    [maxX, minY],
    [maxX, maxY],
    [minX, maxY],
    [minX, minY],
  ]
}

function collection(features: ZoneFeature[]): ZoneCollection {
  return { type: 'FeatureCollection', features }
}

describe('featureContains', () => {
  const zone = feature('zone-a', { type: 'Polygon', coordinates: [square(0, 0, 10, 10)] })

  it('точка внутри полигона', () => {
    expect(featureContains(zone, 5, 5)).toBe(true)
  })

  it('точка снаружи полигона', () => {
    expect(featureContains(zone, 11, 5)).toBe(false)
  })

  it('точка в дырке не считается частью зоны', () => {
    const withHole = feature('zone-hole', {
      type: 'Polygon',
      coordinates: [square(0, 0, 10, 10), square(4, 4, 6, 6)],
    })

    expect(featureContains(withHole, 5, 5)).toBe(false)
    expect(featureContains(withHole, 2, 2)).toBe(true)
  })

  it('MultiPolygon проверяет все части', () => {
    const multi = feature('zone-multi', {
      type: 'MultiPolygon',
      coordinates: [[square(0, 0, 1, 1)], [square(20, 20, 21, 21)]],
    })

    expect(featureContains(multi, 20.5, 20.5)).toBe(true)
    expect(featureContains(multi, 10, 10)).toBe(false)
  })
})

describe('findZoneId', () => {
  it('возвращает зону, в которую попала точка', () => {
    const left = collection([feature('left', { type: 'Polygon', coordinates: [square(0, 0, 5, 10)] })])
    const right = collection([
      feature('right', { type: 'Polygon', coordinates: [square(5, 0, 10, 10)] }),
    ])

    expect(findZoneId(7, 5, [left, right])).toBe('right')
  })

  it('точка вне всех зон — null', () => {
    const zones = collection([feature('left', { type: 'Polygon', coordinates: [square(0, 0, 5, 10)] })])
    expect(findZoneId(50, 50, [zones])).toBeNull()
  })
})

describe('countReportsByZone', () => {
  const adm2 = collection([
    feature('district-a', { type: 'Polygon', coordinates: [square(0, 0, 10, 10)] }),
    feature('district-b', { type: 'Polygon', coordinates: [square(10, 0, 20, 10)] }),
  ])

  it('считает отчёты по зонам и игнорирует точки вне зон', () => {
    const counts = countReportsByZone(
      [
        { lat_public: 5, lng_public: 5 },
        { lat_public: 6, lng_public: 6 },
        { lat_public: 5, lng_public: 15 },
        { lat_public: 50, lng_public: 50 },
      ],
      [adm2],
    )

    expect(counts.get('district-a')).toBe(2)
    expect(counts.get('district-b')).toBe(1)
    expect(counts.size).toBe(2)
  })

  it('точка внутри области и района попадает в счётчики обоих уровней', () => {
    const adm1 = collection([
      feature('oblast', { type: 'Polygon', coordinates: [square(0, 0, 20, 10)] }, 'ADM1'),
    ])

    const counts = countReportsByZone([{ lat_public: 5, lng_public: 5 }], [adm1, adm2])

    expect(counts.get('oblast')).toBe(1)
    expect(counts.get('district-a')).toBe(1)
  })

  it('пустой список отчётов даёт пустую карту', () => {
    expect(countReportsByZone([], [adm2]).size).toBe(0)
  })
})