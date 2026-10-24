/**
 * Контракт Edge Function `submit-report` на стороне клиента — v2.0 (ТЗ §7).
 *
 * ⚠️ Копия схемы из supabase/functions/_shared/report-schema.ts: браузер не может
 * импортировать код Edge Functions. Меняя поля, правь оба файла — тест
 * src/shared/types/report-contract.test.ts держит клиентскую сторону в форме.
 *
 * Что изменилось против v1.0: заявка больше не обязана содержать фото и AI-оценку.
 * Житель выбирает категорию, может добавить комментарий и отметку «опасно для жизни».
 * Координаты идут двумя парами: `gps` (исходный фикс) и `point` (подтверждённая
 * метка). Сдвиг считает сервер — клиент не может «попросить» больше 300 м (§7.2).
 */
import { z } from 'zod'
import { distanceMeters } from '../lib/geo'
import { REPORT_CATEGORIES } from '../lib/categories'
import { residentRiskLevelSchema } from './ai-contract'

/** Версия контракта: несовпадение — 400 INVALID_INPUT, чтобы не писать мусор в БД. */
export const REPORT_CONTRACT_VERSION = '2.0'

/** Комментарий жителя: пусто = null, иначе до 500 символов (§7, CHECK в БД). */
export const COMMENT_MAX_LENGTH = 500

/** Метку можно уточнить только в радиусе 300 м от GPS (§7.2); дублирует CHECK в БД. */
export const MAX_LOCATION_ADJUST_M = 300

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

/**
 * Снимок погоды в момент заявки (§10). Поля обязательны внутри объекта: их даёт
 * один ответ Open-Meteo `current`. Сам объект может быть null — погода справочная,
 * её недоступность не блокирует заявку.
 */
export const weatherSnapshotSchema = z.object({
  captured_at: z.iso.datetime(),
  temperature_c: z.number().min(-60).max(60),
  precipitation_mm: z.number().min(0).max(500),
  humidity_pct: z.number().min(0).max(100),
})

export type WeatherSnapshot = z.infer<typeof weatherSnapshotSchema>

export const submitReportRequestSchema = z
  .object({
    contract_version: z.literal(REPORT_CONTRACT_VERSION),
    client_id: z.uuid(),
    /** SHA-256 идентификатора устройства: сервер не видит сам UUID. */
    device_hash: deviceHashSchema,
    /** Категория, выбранная жителем. В v2 обязательна — от неё зависит триаж. */
    category: z.enum(REPORT_CATEGORIES),
    /** Комментарий: null или непустая строка до 500 символов. */
    comment: z.string().trim().min(1).max(COMMENT_MAX_LENGTH).nullable(),
    /** «Есть непосредственная опасность» — подсказка модератору, не замена 112 (§11). */
    immediate_danger: z.boolean(),
    /** Точка, которую подтвердил житель (после перетаскивания метки). */
    point: mapPointSchema,
    /** Исходный GPS-фикс: по нему сервер сам считает сдвиг. */
    gps: gpsFixSchema,
    /** Фото необязательно; если есть — лежит в папке своего client_id. */
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
 * AI-оценка фото остаётся в контракте `analyze-photo`, но в заявку v2 не входит:
 * решение по срочности принимает триаж + модератор (§8). Тип держим здесь, чтобы
 * экран сканера (до PR-5) по-прежнему мог положить уровень риска в state.
 */
export type PhotoRiskLevel = z.infer<typeof residentRiskLevelSchema>