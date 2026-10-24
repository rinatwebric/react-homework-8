/**
 * Черновик отчёта → тело запроса `submit-report` (контракт v2.0).
 *
 * Вся логика формы — чистые функции: что считается заполненным, сколько символов
 * в комментарии и что именно уйдёт на сервер. Экран только собирает значения.
 *
 * Отличия от v1.0: категория обязательна, фото и глубина колодца — нет,
 * координаты идут двумя парами (GPS + подтверждённая метка), сдвиг метки
 * ограничен 300 м (`MAX_LOCATION_ADJUST_M`).
 */
import { distanceMeters, type LatLng } from '../../../shared/lib/geo'
import type { ReportCategory } from '../../../shared/lib/categories'
import {
  COMMENT_MAX_LENGTH,
  MAX_LOCATION_ADJUST_M,
  REPORT_CONTRACT_VERSION,
  submitReportRequestSchema,
  type SubmitReportRequest,
  type WeatherSnapshot,
} from '../../../shared/types/report-contract'

/** GPS-фикс формы: координаты + точность. Без фикса отправка невозможна (§7.2). */
export type DraftGps = {
  lat: number
  lng: number
  accuracyM: number
}

export type ReportDraft = {
  /** id заявки; при переходе с карты совпадает с папкой фото. */
  clientId: string
  deviceHash: string
  /** Категория из словаря `REPORT_CATEGORIES`; null — ещё не выбрана. */
  category: ReportCategory | null
  /** Комментарий жителя (сырой ввод, обрезаем при сборке тела). */
  comment: string
  immediateDanger: boolean
  /** Точка на карте; null — координат ещё нет (отправка заблокирована). */
  point: LatLng | null
  /** Исходный GPS-фикс: по нему сервер сам считает сдвиг метки. */
  gps: DraftGps | null
  /** Путь фото в бакете; null — отчёт без фото. */
  photoPath: string | null
  /** Снимок погоды в момент заявки (Open-Meteo, Срез 3); null — погода недоступна. */
  weatherSnapshot?: WeatherSnapshot | null
}

export type ReportBlock = 'location' | 'gps' | 'category' | 'comment' | 'pin_far' | 'invalid'

/**
 * Длина комментария в символах, а не в UTF-16: `char_length` в Postgres и лимит
 * 500 в CHECK считают символы, а эмодзи в JS занимает две единицы.
 */
export function commentLength(comment: string): number {
  return Array.from(comment).length
}

export type ResidentRiskSeverity = 'moderate' | 'elevated' | 'critical'

export function getRiskPrefix(riskSeverity: ResidentRiskSeverity): string {
  switch (riskSeverity) {
    case 'critical':
      return '[Критический риск / ЧС]'
    case 'elevated':
      return '[Высокий риск]'
    case 'moderate':
    default:
      return '[Умеренный риск]'
  }
}

/**
 * Безопасное формирование комментария с префиксом риска,
 * гарантирующее непревышение лимита 500 символов (COMMENT_MAX_LENGTH).
 */
export function formatCommentWithRisk(
  rawComment: string,
  riskSeverity: ResidentRiskSeverity = 'moderate',
): string {
  const prefix = getRiskPrefix(riskSeverity)
  const trimmed = rawComment.trim()
  if (!trimmed) return prefix

  const maxRawLen = Math.max(0, COMMENT_MAX_LENGTH - commentLength(prefix) - 1)
  const chars = Array.from(trimmed)
  const safeText = chars.length > maxRawLen ? chars.slice(0, maxRawLen).join('') : trimmed

  return safeText ? `${prefix} ${safeText}` : prefix
}

/** Насколько метка сдвинута от GPS; null — нет точки или фикса. */
export function locationOffsetM(draft: Pick<ReportDraft, 'point' | 'gps'>): number | null {
  if (!draft.point || !draft.gps) return null
  return distanceMeters(draft.gps, draft.point)
}

/** Хватает ли данных для кнопки «Отправить» — до нажатия, чтобы кнопка была честной. */
export function submissionBlock(draft: ReportDraft): ReportBlock | null {
  if (!draft.point) return 'location'
  // Без GPS-фикса заявку не примут (§7): метка вручную не заменяет геопозицию,
  // поэтому причина отдельная — иначе подсказка врёт про «поставьте точку».
  if (!draft.gps) return 'gps'
  if (!draft.category) return 'category'
  if (commentLength(draft.comment.trim()) > COMMENT_MAX_LENGTH) return 'comment'

  const offset = locationOffsetM(draft)
  if (offset !== null && offset > MAX_LOCATION_ADJUST_M) return 'pin_far'
  return null
}

export type BuildResult =
  | { ok: true; payload: SubmitReportRequest }
  | { ok: false; reason: ReportBlock }

export function buildSubmitPayload(draft: ReportDraft): BuildResult {
  const block = submissionBlock(draft)
  if (block) return { ok: false, reason: block }

  const { point, gps, category } = draft
  if (!point || !gps || !category) {
    // Недостижимо: без точки, фикса или категории submissionBlock уже вернул блок.
    return { ok: false, reason: submissionBlock(draft) ?? 'invalid' }
  }

  const comment = draft.comment.trim()

  const payload = {
    contract_version: REPORT_CONTRACT_VERSION,
    client_id: draft.clientId,
    device_hash: draft.deviceHash,
    category,
    // Пустая строка и null — одно и то же («комментария нет»).
    comment: comment === '' ? null : comment,
    immediate_danger: draft.immediateDanger,
    point,
    gps: { lat: gps.lat, lng: gps.lng, accuracy_m: gps.accuracyM },
    photo_path: draft.photoPath,
    weather_snapshot: draft.weatherSnapshot ?? null,
  }

  const parsed = submitReportRequestSchema.safeParse(payload)
  return parsed.success ? { ok: true, payload: parsed.data } : { ok: false, reason: 'invalid' }
}
