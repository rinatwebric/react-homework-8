/**
 * Фильтры карты (категория / период / статус) живут в URL: ссылку на нужный вид карты
 * можно переслать, а «назад» возвращает прежний фильтр. Логика — чистые функции с тестами.
 */
import { REPORT_CATEGORIES, type ReportCategory } from '../../../shared/lib/categories'
import type { ReportStatus } from '../../../shared/types/database'

export const CATEGORY_FILTERS = ['all', ...REPORT_CATEGORIES] as const
export type CategoryFilter = (typeof CATEGORY_FILTERS)[number]

export const PERIOD_FILTERS = ['7d', '30d', 'all'] as const
export type PeriodFilter = (typeof PERIOD_FILTERS)[number]

export const STATUS_FILTERS = [
  'all',
  'new',
  'triaged',
  'assigned',
  'in_progress',
  'resolved',
] as const
export type StatusFilter = (typeof STATUS_FILTERS)[number]

export type MapFilters = {
  category: CategoryFilter
  period: PeriodFilter
  status: StatusFilter
}

/** 30 дней — компромисс: свежие сигналы видны, старые не забивают карту. */
export const DEFAULT_MAP_FILTERS: MapFilters = { category: 'all', period: '30d', status: 'all' }

/** Ключи в URL короткие: `?category=basement_water&period=7d&status=new`. */
export const FILTER_PARAMS = { category: 'category', period: 'period', status: 'status' } as const

const PERIOD_DAYS: Record<PeriodFilter, number | null> = { '7d': 7, '30d': 30, all: null }

const DAY_MS = 24 * 60 * 60 * 1000

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/** Мусор в URL не ломает карту: неизвестное значение → значение по умолчанию. */
export function parseMapFilters(params: URLSearchParams): MapFilters {
  return {
    category: pick(params.get(FILTER_PARAMS.category), CATEGORY_FILTERS, DEFAULT_MAP_FILTERS.category),
    period: pick(params.get(FILTER_PARAMS.period), PERIOD_FILTERS, DEFAULT_MAP_FILTERS.period),
    status: pick(params.get(FILTER_PARAMS.status), STATUS_FILTERS, DEFAULT_MAP_FILTERS.status),
  }
}

/** Значения по умолчанию в URL не пишем — ссылка короче. */
export function serializeMapFilters(filters: MapFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of Object.keys(FILTER_PARAMS) as (keyof MapFilters)[]) {
    if (filters[key] !== DEFAULT_MAP_FILTERS[key]) params.set(FILTER_PARAMS[key], filters[key])
  }
  return params
}

export function hasActiveFilters(filters: MapFilters): boolean {
  return (
    filters.category !== DEFAULT_MAP_FILTERS.category ||
    filters.period !== DEFAULT_MAP_FILTERS.period ||
    filters.status !== DEFAULT_MAP_FILTERS.status
  )
}

/** Отчёт в периоде, если он не старше N дней от `now`; неизвестная дата — не показываем. */
export function isReportInPeriod(createdAt: string, period: PeriodFilter, now: Date): boolean {
  const created = Date.parse(createdAt)
  if (Number.isNaN(created)) return false

  const days = PERIOD_DAYS[period]
  if (days === null) return true

  return created >= now.getTime() - days * DAY_MS
}

type FilterableReport = {
  category_user: ReportCategory | null
  created_at: string
  status: ReportStatus
}

export function matchesFilters(report: FilterableReport, filters: MapFilters, now: Date): boolean {
  const categoryOk = filters.category === 'all' || report.category_user === filters.category
  const statusOk = filters.status === 'all' || report.status === filters.status
  return categoryOk && statusOk && isReportInPeriod(report.created_at, filters.period, now)
}

export function filterReports<T extends FilterableReport>(
  reports: readonly T[],
  filters: MapFilters,
  now: Date,
): T[] {
  return reports.filter((report) => matchesFilters(report, filters, now))
}
