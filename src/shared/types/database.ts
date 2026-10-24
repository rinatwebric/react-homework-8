/**
 * Типы строк БД SuuTech.
 *
 * ⚠️ Написаны руками: в среде разработки нет Docker, поэтому
 * `npx supabase gen types typescript --local` недоступен.
 * После `npx supabase db push` на облачный проект перегенерируй типы:
 *   npx supabase gen types typescript --project-id <ref> > src/shared/types/database.ts
 * и замени этот файл сгенерированным (структура Database → public.Tables).
 */
import type { ReportCategory } from '../lib/categories'

/**
 * Статусы заявки (§12).
 */
export const REPORT_STATUSES = [
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]

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
  /** v2.0 (§14): категория жителя. */
  category_user: ReportCategory | null
  comment: string | null
  /** На сколько метров метку сдвинули от GPS (≤300, CHECK в БД). */
  location_adjusted_m: number | null
  immediate_danger: boolean
  weather_snapshot: unknown
  created_by: string | null
  status: ReportStatus
  moderator_note: string | null
  device_hash: string | null
  ip_hash: string | null
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
  | 'status'
  | 'photo_path'
  | 'is_demo'
  | 'accuracy_m'
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
