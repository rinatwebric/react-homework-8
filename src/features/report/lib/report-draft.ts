/**
 * Черновик отчёта → тело запроса `submit-report`.
 *
 * Вся логика формы — чистые функции: что считается заполненным, как разобрать
 * глубину колодца и что именно уйдёт на сервер. Экран только собирает значения.
 */
import { PIN_MAX_OFFSET_M, WELL_DEPTH_MAX_M } from '../../../config/report'
import type { LatLng } from '../../../shared/lib/geo'
import type { ReportContext } from '../../../shared/types/report-context'
import {
  REPORT_CONTRACT_VERSION,
  submitReportRequestSchema,
  type SubmitReportRequest,
} from '../../../shared/types/report-contract'

export type ReportDraft = {
  clientId: string
  deviceHash: string
  /** Точка на карте; null — координат ещё нет (отправка заблокирована). */
  point: LatLng | null
  /** Точность GPS; null — точку поставили вручную, точность не измерена. */
  accuracyM: number | null
  waterInBasement: boolean | null
  /** Сырой ввод поля «глубина воды в колодце»: '', '1,5', '2'. */
  wellDepthRaw: string
  /** Насколько пин сдвинут от GPS, метры. */
  gpsOffsetM: number
  photo: ReportContext | null
}

export type ReportBlock = 'location' | 'basement' | 'well_depth' | 'pin_far' | 'invalid'

export type WellDepthResult =
  | { ok: true; value: number | null }
  | { ok: false; error: 'not_number' | 'too_deep' | 'negative' }

/**
 * Глубина из текстового поля: пусто — «не знаю» (null), запятая как разделитель,
 * округление до 0.1 м. Результат — метры.
 */
export function parseWellDepth(raw: string): WellDepthResult {
  const trimmed = raw.trim().replace(',', '.')
  if (trimmed === '') return { ok: true, value: null }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return { ok: false, error: 'not_number' }

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return { ok: false, error: 'not_number' }
  if (parsed < 0) return { ok: false, error: 'negative' }
  if (parsed > WELL_DEPTH_MAX_M) return { ok: false, error: 'too_deep' }

  return { ok: true, value: Math.round(parsed * 10) / 10 }
}

/** Хватает ли данных для кнопки «Отправить» — до нажатия, чтобы кнопка была активной честно. */
export function submissionBlock(draft: ReportDraft): ReportBlock | null {
  if (!draft.point) return 'location'
  if (draft.waterInBasement === null) return 'basement'
  if (!parseWellDepth(draft.wellDepthRaw).ok) return 'well_depth'
  if (draft.gpsOffsetM > PIN_MAX_OFFSET_M) return 'pin_far'
  return null
}

export type BuildResult =
  | { ok: true; payload: SubmitReportRequest }
  | { ok: false; reason: ReportBlock }

export function buildSubmitPayload(draft: ReportDraft, mode: 'resident' | 'farmer' = 'resident'): BuildResult {
  const block = submissionBlock(draft)
  if (block) return { ok: false, reason: block }

  const wellDepth = parseWellDepth(draft.wellDepthRaw)
  if (!wellDepth.ok) return { ok: false, reason: 'well_depth' }
  if (!draft.point || draft.waterInBasement === null) {
    return { ok: false, reason: 'location' }
  }

  const payload = {
    contract_version: REPORT_CONTRACT_VERSION,
    client_id: draft.clientId,
    device_hash: draft.deviceHash,
    lat: draft.point.lat,
    lng: draft.point.lng,
    accuracy_m: draft.accuracyM,
    water_in_basement: draft.waterInBasement,
    well_depth_m: wellDepth.value,
    photo_path: draft.photo?.photoPath ?? null,
    risk_level: draft.photo?.riskLevel ?? null,
    confidence: draft.photo?.confidence ?? null,
    findings: draft.photo?.findings ?? [],
    recommendations: draft.photo?.recommendations ?? [],
    // Время съёмки клиент достоверно не знает — сервер ставит created_at.
    captured_at: null,
    mode,
  }

  const parsed = submitReportRequestSchema.safeParse(payload)
  return parsed.success ? { ok: true, payload: parsed.data } : { ok: false, reason: 'invalid' }
}