/**
 * Контракт Edge Function `submit-report` — серверная сторона.
 *
 * ⚠️ Копия src/shared/types/report-contract.ts: Deno не может импортировать код
 * приложения. Меняя поля, правь оба файла (и миграцию, если меняются колонки).
 *
 * Правило честности: `risk_level`/`confidence` приходят только из AI-оценки фото
 * (`analyze-photo`), уровень зоны считают пороговые правила, а не эта функция.
 */
import { z } from 'npm:zod@4.6.7'

/** Версия контракта: несовпадение — 400 INVALID_INPUT, чтобы не писать мусор в БД. */
export const REPORT_CONTRACT_VERSION = '1.0'

/** Глубина колодца: 0…50 м. Совпадает с src/config/report.ts и check в БД. */
export const WELL_DEPTH_MAX_M = 50

/** Стартовые лимиты частоты (калибруются на пилоте). */
export const REPORTS_PER_DEVICE_PER_HOUR = 10
/** IP делят жители одного двора/села — лимит на IP выше, чем на устройство. */
export const REPORTS_PER_IP_PER_HOUR = 30

export const deviceHashSchema = z.string().regex(/^[0-9a-f]{64}$/)

/**
 * Путь объекта в бакете `report-photos`: `reports/<client_id>/<файл>`
 * (допускается и без префикса `reports/`). Первый сегмент-идентификатор обязан
 * совпадать с `client_id` — иначе чужое фото можно привязать к своему отчёту.
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
    /** SHA-256 идентификатора устройства: сам UUID устройства сервер не видит. */
    device_hash: deviceHashSchema,
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    /** Точность GPS, метры. null — точка поставлена вручную (точность не измерена). */
    accuracy_m: z.number().min(0).max(5_000).nullable(),
    water_in_basement: z.boolean(),
    well_depth_m: z.number().min(0).max(WELL_DEPTH_MAX_M).nullable(),
    photo_path: photoPathSchema.nullable(),
    risk_level: z.enum(['low', 'medium', 'high']).nullable(),
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

/**
 * Пилотная зона (срез 2): Ак-Өлөң, Тонский район, Иссык-Кульская область.
 * Границы — грубый bbox вокруг села (≈5 км). Совпадает с src/config/pilot.ts.
 * Нужен, чтобы у отчёта появился zone_id до появления слоя зон (срез 3).
 */
export const PILOT_ZONE_ID = 'kg-issyk-ton-ak-olong'
const PILOT_BBOX = { south: 42.2979, north: 42.3979, west: 76.1169, east: 76.2169 } as const

/** zone_id по координатам: пилотная зона или null (остальная страна — срез 3). */
export function zoneForPoint(lat: number, lng: number): string | null {
  const inside =
    lat >= PILOT_BBOX.south &&
    lat <= PILOT_BBOX.north &&
    lng >= PILOT_BBOX.west &&
    lng <= PILOT_BBOX.east
  return inside ? PILOT_ZONE_ID : null
}