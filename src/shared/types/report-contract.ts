/**
 * Контракт Edge Function `submit-report` на стороне клиента.
 *
 * ⚠️ Копия схемы из supabase/functions/_shared/report-schema.ts: браузер не может
 * импортировать код Edge Functions. Меняя поля, правь оба файла — тест
 * src/shared/types/report-contract.test.ts держит клиентскую сторону в форме.
 */
import { z } from 'zod'
import { residentRiskLevelSchema } from './ai-contract'

/** Версия контракта: несовпадение — 400 INVALID_INPUT, чтобы не писать мусор в БД. */
export const REPORT_CONTRACT_VERSION = '1.0'

/** Глубина колодца: 0…50 м. Дублирует src/config/report.ts и лимит функции. */
export const WELL_DEPTH_MAX_M = 50

export const deviceHashSchema = z.string().regex(/^[0-9a-f]{64}$/)

/**
 * Путь объекта в бакете `report-photos` в формате `reports/<client_id>/<файл>`
 * (допускается и без префикса `reports/`). Первый сегмент-идентификатор обязан
 * совпадать с `client_id`: иначе чужое фото можно привязать к своему отчёту.
 * Такой же путь пишет `analyze-photo` при загрузке снимка.
 */
const PHOTO_CLIENT_SEGMENT =
  /^(?:reports\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/[\w.-]+$/

export const photoPathSchema = z.string().trim().min(3).max(200).regex(PHOTO_CLIENT_SEGMENT)

/** client_id из пути фото; null — путь не по формату бакета. */
export function photoPathClientId(path: string): string | null {
  const match = PHOTO_CLIENT_SEGMENT.exec(path.trim())
  return match?.[1] ?? null
}

export const submitReportRequestSchema = z
  .object({
    contract_version: z.literal(REPORT_CONTRACT_VERSION),
    client_id: z.uuid(),
    /** SHA-256 идентификатора устройства: сервер не видит сам UUID. */
    device_hash: deviceHashSchema,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    /** Точность GPS, метры. null — точка поставлена вручную (точность не измерена). */
    accuracy_m: z.number().min(0).max(5_000).nullable(),
    water_in_basement: z.boolean(),
    well_depth_m: z.number().min(0).max(WELL_DEPTH_MAX_M).nullable(),
    photo_path: photoPathSchema.nullable(),
    risk_level: residentRiskLevelSchema.nullable(),
    confidence: z.number().min(0).max(1).nullable(),
    findings: z.array(z.string().trim().min(1).max(240)).max(6),
    recommendations: z.array(z.string().trim().min(1).max(240)).max(5),
    captured_at: z.iso.datetime().nullable(),
    mode: z.enum(['resident', 'farmer']),
  })
  .superRefine((value, ctx) => {
    if (value.photo_path === null) return
    if (photoPathClientId(value.photo_path) !== value.client_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['photo_path'],
        message: 'Фото должно лежать в папке своего client_id',
      })
    }
  })

export type SubmitReportRequest = z.infer<typeof submitReportRequestSchema>

export const submitReportResponseSchema = z.object({
  id: z.uuid(),
  /** true — такой client_id уже был: форма отправилась повторно, дубля в БД нет. */
  duplicate: z.boolean(),
})

export type SubmitReportResponse = z.infer<typeof submitReportResponseSchema>