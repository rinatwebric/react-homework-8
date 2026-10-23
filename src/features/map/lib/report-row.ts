/**
 * Строка `reports_public` для карты: zod-валидация ответа PostgREST (данные извне).
 * Читаем только нужные карте поля — точных координат и `device_hash` в представлении нет.
 */
import { z } from 'zod'
import { RESIDENT_RISK_LEVELS } from '../../../config/risk'
import { REPORT_MODES, REPORT_STATUSES } from '../../../shared/types/database'

/** Тот же список полей, что в REPORT_SELECT: одно место правки. */
export const REPORT_SELECT = [
  'id',
  'created_at',
  'lat_public',
  'lng_public',
  'zone_id',
  'risk_level',
  'confidence',
  'water_in_basement',
  'well_depth_m',
  'status',
  'mode',
  'is_demo',
].join(',')

export const mapReportSchema = z.object({
  id: z.string().min(1),
  created_at: z.string().min(1),
  lat_public: z.number().min(-90).max(90),
  lng_public: z.number().min(-180).max(180),
  zone_id: z.string().nullable(),
  risk_level: z.enum(RESIDENT_RISK_LEVELS).nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  water_in_basement: z.boolean(),
  well_depth_m: z.number().nullable(),
  status: z.enum(REPORT_STATUSES),
  mode: z.enum(REPORT_MODES),
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