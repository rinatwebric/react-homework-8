import { describe, expect, it } from 'vitest'
import { ZoneDataError, parseZoneCollection, zoneIdOf, zoneNameOf } from './zone-geojson'

const RING = [
  [76.1, 42.3],
  [76.2, 42.3],
  [76.2, 42.4],
  [76.1, 42.3],
]

type FeatureProps = { shapeID?: string; shapeName?: string; shapeType?: string }

function feature(props: FeatureProps = {}, geometry: unknown = { type: 'Polygon', coordinates: [RING] }) {
  return {
    type: 'Feature',
    properties: { shapeID: '92254566B71058624193805', shapeName: 'Ton', shapeType: 'ADM2', ...props },
    geometry,
  }
}

function collection(features: unknown[]) {
  return { type: 'FeatureCollection', features }
}

describe('parseZoneCollection', () => {
  it('принимает валидную коллекцию районов и отдаёт id/имя зоны', () => {
    const zones = parseZoneCollection(collection([feature()]), 'ADM2')

    expect(zones.features).toHaveLength(1)
    expect(zoneIdOf(zones.features[0]!)).toBe('92254566B71058624193805')
    expect(zoneNameOf(zones.features[0]!)).toBe('Ton')
  })

  it('принимает MultiPolygon: у КГ есть районы из нескольких частей', () => {
    const zones = parseZoneCollection(
      collection([feature({}, { type: 'MultiPolygon', coordinates: [[RING], [RING]] })]),
      'ADM2',
    )

    expect(zones.features[0]!.geometry.type).toBe('MultiPolygon')
  })

  it('отклоняет не-GeoJSON (null, строку, пустую коллекцию)', () => {
    for (const raw of [null, 'FeatureCollection', collection([])]) {
      expect(() => parseZoneCollection(raw, 'ADM2')).toThrow(ZoneDataError)
    }
  })

  it('отклоняет координаты вне диапазона: широта 142 — это не Кыргызстан', () => {
    const broken = feature(
      {},
      {
        type: 'Polygon',
        coordinates: [[[76.1, 142], [76.2, 142], [76.2, 142.1], [76.1, 142]]],
      },
    )

    expect(() => parseZoneCollection(collection([broken]), 'ADM2')).toThrow(ZoneDataError)
  })

  it('отклоняет незамкнутое кольцо (меньше 4 точек)', () => {
    const broken = feature({}, { type: 'Polygon', coordinates: [[[76.1, 42.3], [76.2, 42.3], [76.1, 42.3]]] })

    expect(() => parseZoneCollection(collection([broken]), 'ADM2')).toThrow(ZoneDataError)
  })

  it('отклоняет зону другого уровня: ADM1 вместо ожидаемого ADM2', () => {
    const oblast = feature({ shapeType: 'ADM1' })

    expect(() => parseZoneCollection(collection([oblast]), 'ADM2')).toThrow(
      /Ожидались зоны ADM2/,
    )
  })

  it('отклоняет зону без shapeID — тогда её нечем связать с zone_risk', () => {
    expect(() => parseZoneCollection(collection([feature({ shapeID: '' })]), 'ADM2')).toThrow(
      ZoneDataError,
    )
  })
})