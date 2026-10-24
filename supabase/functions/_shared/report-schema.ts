import { z } from 'npm:zod@4.6.7'
import { REPORT_CATEGORIES } from './categories.ts'
import { distanceMeters } from './geo.ts'

/**
 * Контракт Edge Function `submit-report` — серверная сторона, v2.0 (ТЗ §7).
 *
 * ⚠️ Копия src/shared/types/report-contract.ts: Deno не может импортировать код
 * приложения. Меняя поля, правь оба файла (и миграцию, если меняются колонки).
 *
 * Правило честности v2: ни категория, ни срочность не «угадываются» здесь.
 * `category` приходит от жителя, `urgency` появится только из AI-триажа и
 * подтверждения модератора (§8). Уровень зоны считают пороговые правила.
 */

/** Версия контракта: несовпадение — 400 INVALID_INPUT, чтобы не писать мусор в БД. */
export const REPORT_CONTRACT_VERSION = '2.0'

/** Комментарий жителя: null или 1…500 символов (§7, CHECK в БД). */
export const COMMENT_MAX_LENGTH = 500

/** Метку можно сдвинуть не дальше 300 м от GPS (§7.2), дублирует CHECK в БД. */
export const MAX_LOCATION_ADJUST_M = 300

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

/** Точка на карте: широта/долгота в градусах. */
export const mapPointSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

/** GPS-фикс: точка + точность в метрах. Без фикса заявку не отправить (§7.2). */
export const gpsFixSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy_m: z.number().min(0).max(5_000),
})

/** Снимок погоды в момент заявки (§10): справочные данные Open-Meteo, может быть null. */
export const weatherSnapshotSchema = z.object({
  captured_at: z.iso.datetime(),
  temperature_c: z.number().min(-60).max(60),
  precipitation_mm: z.number().min(0).max(500),
  humidity_pct: z.number().min(0).max(100),
})

export const submitReportRequestSchema = z
  .object({
    contract_version: z.literal(REPORT_CONTRACT_VERSION),
    client_id: z.uuid(),
    /** SHA-256 идентификатора устройства: сам UUID устройства сервер не видит. */
    device_hash: deviceHashSchema,
    /** Категория от жителя: от неё зависит триаж, поэтому обязательна. */
    category: z.enum(REPORT_CATEGORIES),
    /** Комментарий: null или непустая строка до 500 символов. */
    comment: z.string().trim().min(1).max(COMMENT_MAX_LENGTH).nullable(),
    /** «Есть непосредственная опасность» — подсказка модератору, не замена 112 (§11). */
    immediate_danger: z.boolean(),
    /** Подтверждённая жителем метка (после перетаскивания). */
    point: mapPointSchema,
    /** Исходный GPS-фикс: сдвиг считает сервер, клиенту верить нельзя (§7.2). */
    gps: gpsFixSchema,
    photo_path: photoPathSchema.nullable(),
    weather_snapshot: weatherSnapshotSchema.nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.photo_path !== null && photoPathClientId(value.photo_path) !== value.client_id) {
      ctx.addIssue({
        code: 'custom',
        path: ['photo_path'],
        message: 'Фото должно лежать в папке своего client_id',
      })
    }

    if (distanceMeters(value.gps, value.point) > MAX_LOCATION_ADJUST_M) {
      ctx.addIssue({
        code: 'custom',
        path: ['point'],
        message: `Метка дальше ${MAX_LOCATION_ADJUST_M} м от геопозиции`,
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