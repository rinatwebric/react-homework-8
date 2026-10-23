/**
 * Границы зон приходят из сети (`public/geo/*.geojson`) — внешние данные по правилам
 * проекта валидируются zod. Проверяем только то, что используем: тип коллекции,
 * диапазоны координат и свойства зоны (shapeID / shapeName / shapeType).
 */
import { z } from 'zod'

const longitude = z.number().min(-180).max(180)
const latitude = z.number().min(-90).max(90)

/** Позиция GeoJSON — [долгота, широта, (высота)], порядок именно такой (RFC 7946). */
const positionSchema = z.tuple([longitude, latitude]).rest(z.number())
/** Кольцо: минимум 4 точки, первая совпадает с последней. */
const ringSchema = z.array(positionSchema).min(4)
const polygonSchema = z.array(ringSchema).min(1)

const geometrySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('Polygon'), coordinates: polygonSchema }),
  z.object({ type: z.literal('MultiPolygon'), coordinates: z.array(polygonSchema).min(1) }),
])

const featureSchema = z.object({
  type: z.literal('Feature'),
  properties: z.object({
    shapeID: z.string().min(1),
    shapeName: z.string().min(1),
    shapeType: z.enum(['ADM1', 'ADM2']),
  }),
  geometry: geometrySchema,
})

export const zoneCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(featureSchema).min(1),
})

export type ZoneFeature = z.infer<typeof featureSchema>
export type ZoneCollection = z.infer<typeof zoneCollectionSchema>
export type ZoneKind = 'ADM1' | 'ADM2'

/** Битые границы — не повод показывать белый экран: карта скажет «не удалось загрузить». */
export class ZoneDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ZoneDataError'
  }
}

export function parseZoneCollection(raw: unknown, kind: ZoneKind): ZoneCollection {
  const parsed = zoneCollectionSchema.safeParse(raw)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    throw new ZoneDataError(
      `Границы зон повреждены: ${issue ? `${issue.path.join('.')} — ${issue.message}` : 'неизвестная ошибка'}`,
    )
  }

  const wrongKind = parsed.data.features.find((feature) => feature.properties.shapeType !== kind)
  if (wrongKind) {
    throw new ZoneDataError(
      `Ожидались зоны ${kind}, пришла ${wrongKind.properties.shapeType}`,
    )
  }

  return parsed.data
}

/** zone_id в таблице zone_risk — это shapeID из GeoJSON. */
export function zoneIdOf(feature: ZoneFeature): string {
  return feature.properties.shapeID
}

export function zoneNameOf(feature: ZoneFeature): string {
  return feature.properties.shapeName
}