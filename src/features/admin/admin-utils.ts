import type { ReportCategory, UrgencyLevel } from '../../shared/lib/categories'
import type { ReportStatus, ReportWithTriage } from '../../shared/types/database'
import { distanceMeters } from '../../shared/lib/geo'

export const DUPLICATE_MAX_DISTANCE_M = 150

export interface AdminKpiStats {
  newCount: number
  triagedCount: number
  inProgressCount: number
  resolvedCount: number
  rejectedCount: number
  needsReviewCount: number
}

/** Подсчёт KPI для админ-панели */
export function calculateAdminKpi(reports: ReportWithTriage[]): AdminKpiStats {
  const stats: AdminKpiStats = {
    newCount: 0,
    triagedCount: 0,
    inProgressCount: 0,
    resolvedCount: 0,
    rejectedCount: 0,
    needsReviewCount: 0,
  }

  for (const r of reports) {
    if (r.status === 'new') stats.newCount++
    else if (r.status === 'triaged') stats.triagedCount++
    else if (r.status === 'in_progress' || r.status === 'assigned') stats.inProgressCount++
    else if (r.status === 'resolved') stats.resolvedCount++
    else if (r.status === 'rejected') stats.rejectedCount++

    if (r.ai_triage?.needs_human_review) {
      stats.needsReviewCount++
    }
  }

  return stats
}

export interface ReportFilterOptions {
  status?: ReportStatus | 'all'
  category?: ReportCategory | 'all'
  dangerOnly?: boolean
  search?: string
  urgency?: UrgencyLevel | 'all'
  needsReviewOnly?: boolean
  duplicateGroup?: string | null
}

/** Фильтрация списка заявок */
export function filterReports(
  reports: ReportWithTriage[],
  options: ReportFilterOptions,
): ReportWithTriage[] {
  const {
    status = 'all',
    category = 'all',
    dangerOnly = false,
    search = '',
    urgency = 'all',
    needsReviewOnly = false,
    duplicateGroup,
  } = options

  const searchLower = search.trim().toLowerCase()

  return reports.filter((r) => {
    if (status !== 'all' && r.status !== status) return false
    if (category !== 'all' && r.category_user !== category) return false
    if (dangerOnly && !r.immediate_danger) return false
    if (urgency !== 'all' && r.ai_triage?.urgency_ai !== urgency) return false
    if (needsReviewOnly && !r.ai_triage?.needs_human_review) return false
    if (duplicateGroup && r.ai_triage?.duplicate_group !== duplicateGroup) return false

    if (searchLower) {
      const commentMatch = (r.comment ?? '').toLowerCase().includes(searchLower)
      const idMatch = r.id.toLowerCase().includes(searchLower)
      const noteMatch = (r.moderator_note ?? '').toLowerCase().includes(searchLower)
      if (!commentMatch && !idMatch && !noteMatch) return false
    }

    return true
  })
}

/** Проверка расстояния двух точек на попадание в радиус дубликатов (150 м) */
export function isDuplicateDistance(
  p1: { lat: number; lng: number },
  p2: { lat: number; lng: number },
): boolean {
  return distanceMeters(p1, p2) <= DUPLICATE_MAX_DISTANCE_M
}
