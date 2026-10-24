/**
 * Строка `reports_public` для карты: zod-валидация ответа PostgREST (данные извне).
 * Читаем только нужные карте поля — точных координат и `device_hash` в представлении нет.
 */
import { z } from 'zod'
import { REPORT_CATEGORIES } from '../../../shared/lib/categories'
import { REPORT_STATUSES } from '../../../shared/types/database'

/** Тот же список полей, что в REPORT_SELECT: одно место правки. */
export const REPORT_SELECT = [
  'id',
  'created_at',
  'lat_public',
  'lng_public',
  'zone_id',
  'category_user',
  'comment',
  'immediate_danger',
  'weather_snapshot',
  'status',
  'is_demo',
].join(',')

export const mapWeatherSchema = z
  .object({
    temperature_c: z.number().optional(),
    precipitation_mm: z.number().optional(),
    humidity_pct: z.number().optional(),
    temp_c: z.number().optional(),
    precip_mm: z.number().optional(),
    humidity: z.number().optional(),
  })
  .passthrough()

export type MapWeatherSnapshot = z.infer<typeof mapWeatherSchema>

export const mapReportSchema = z.object({
  id: z.string().min(1),
  created_at: z.string().min(1),
  lat_public: z.number().min(-90).max(90),
  lng_public: z.number().min(-180).max(180),
  zone_id: z.string().nullable(),
  category_user: z.enum(REPORT_CATEGORIES).nullable(),
  comment: z.string().nullable(),
  immediate_danger: z.boolean(),
  weather_snapshot: mapWeatherSchema.nullable(),
  status: z.enum(REPORT_STATUSES),
  is_demo: z.boolean(),
})

export const mapReportsSchema = z.array(mapReportSchema)

export type MapReport = z.infer<typeof mapReportSchema>

/** Битая строка в ответе — не повод терять остальные: возвращаем валидные и число пропущенных. */
export function parseMapReports(raw: unknown): { reports: MapReport[]; skipped: number } {
  const parsed = mapReportsSchema.safeParse(raw)
  if (parsed.success) return { reports: parsed.data, skipped: 0 }

  if (!Array.isArray(raw)) throw new Error('Ответ базы по отчётам не похож на список')

  const reports = raw.flatMap((row) => {
    const one = mapReportSchema.safeParse(row)
    return one.success ? [one.data] : []
  })

  return { reports, skipped: raw.length - reports.length }
}
