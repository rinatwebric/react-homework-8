/**
 * Типы строк БД SuuTech.
 *
 * ⚠️ Написаны руками: в среде разработки нет Docker, поэтому
 * `npx supabase gen types typescript --local` недоступен.
 * После `npx supabase db push` на облачный проект перегенерируй типы:
 *   npx supabase gen types typescript --project-id <ref> > src/shared/types/database.ts
 * и замени этот файл сгенерированным (структура Database → public.Tables).
 */
import type { ResidentRiskLevel } from '../../config/risk'
import type { ReportCategory } from '../lib/categories'

/**
 * Статусы заявки (§12). `reviewed` — legacy v1.0: остаётся в БД и в фильтрах,
 * пока прод-админка не переехала на v2 (удаление — PR очистки).
 */
export const REPORT_STATUSES = [
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
  'reviewed',
] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

export const REPORT_MODES = ['resident', 'farmer'] as const
export type ReportMode = (typeof REPORT_MODES)[number]
export type AlertLevel = 'elevated' | 'high' | 'critical'
export type AlertSource = 'weather' | 'sensor' | 'manual'
export type AlertAudience = 'residents' | 'services'
export type AppLang = 'ru' | 'ky'

/** Строка таблицы reports — полный доступ (модератор / service role). */
export type ReportRow = {
  id: string
  client_id: string
  created_at: string
  captured_at: string | null
  photo_path: string | null
  lat: number | null
  lng: number | null
  accuracy_m: number | null
  zone_id: string | null
  /** v2.0 (§14): категория жителя; null — у заявок v1.0. */
  category_user: ReportCategory | null
  comment: string | null
  /** На сколько метров метку сдвинули от GPS (≤300, CHECK в БД). */
  location_adjusted_m: number | null
  immediate_danger: boolean
  weather_snapshot: unknown
  created_by: string | null
  /** Поля v1.0: остаются до PR очистки. */
  risk_level: ResidentRiskLevel | null
  confidence: number | null
  findings: string[]
  recommendations: unknown
  water_in_basement: boolean
  well_depth_m: number | null
  mode: ReportMode
  status: ReportStatus
  moderator_note: string | null
  device_hash: string | null
  ip_hash: string | null
  photo_sha256: string | null
  is_demo: boolean
  lat_public: number | null
  lng_public: number | null
}

/** Строка view reports_public — то, что видит любой житель (координаты округлены). */
export type ReportPublicRow = Pick<
  ReportRow,
  | 'id'
  | 'created_at'
  | 'captured_at'
  | 'lat_public'
  | 'lng_public'
  | 'zone_id'
  | 'category_user'
  | 'comment'
  | 'immediate_danger'
  | 'weather_snapshot'
  | 'risk_level'
  | 'confidence'
  | 'findings'
  | 'recommendations'
  | 'water_in_basement'
  | 'well_depth_m'
  | 'status'
  | 'photo_path'
  | 'mode'
  | 'is_demo'
>

export type AlertRow = {
  id: string
  created_at: string
  zone_id: string | null
  level: AlertLevel
  message: string
  source: AlertSource
  audience: AlertAudience
}

export type PushSubscriptionRow = {
  id: string
  endpoint: string
  keys: unknown
  area_lat: number | null
  area_lng: number | null
  zone_id: string | null
  lang: AppLang
  created_at: string
}

export type ModeratorRow = {
  user_id: string
  created_at: string
}