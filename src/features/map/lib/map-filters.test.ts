import { describe, expect, it } from 'vitest'
import type { ReportCategory } from '../../../shared/lib/categories'
import type { ReportStatus } from '../../../shared/types/database'
import {
  DEFAULT_MAP_FILTERS,
  filterReports,
  hasActiveFilters,
  isReportInPeriod,
  parseMapFilters,
  serializeMapFilters,
} from './map-filters'

const NOW = new Date('2026-10-24T12:00:00Z')

const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

function report(
  overrides: Partial<{
    category_user: ReportCategory | null
    created_at: string
    status: ReportStatus
  }> = {},
) {
  return {
    category_user: 'basement_water' as const,
    created_at: daysAgo(1),
    status: 'new' as const,
    ...overrides,
  }
}

describe('parseMapFilters', () => {
  it('на пустом URL отдаёт значения по умолчанию', () => {
    expect(parseMapFilters(new URLSearchParams())).toEqual(DEFAULT_MAP_FILTERS)
  })

  it('мусор в параметрах не ломает карту', () => {
    const filters = parseMapFilters(
      new URLSearchParams('category=huge&period=9999d&status=reviewed'),
    )

    expect(filters).toEqual(DEFAULT_MAP_FILTERS)
  })

  it('читает валидные параметры', () => {
    const filters = parseMapFilters(
      new URLSearchParams('category=standing_water&period=7d&status=resolved'),
    )

    expect(filters).toEqual({ category: 'standing_water', period: '7d', status: 'resolved' })
  })
})

describe('serializeMapFilters', () => {
  it('не пишет значения по умолчанию в URL', () => {
    expect(serializeMapFilters(DEFAULT_MAP_FILTERS).toString()).toBe('')
  })

  it('переживает круговой обход URL → фильтры → URL', () => {
    const filters = { category: 'damp_wall', period: '7d', status: 'new' } as const
    const restored = parseMapFilters(serializeMapFilters(filters))

    expect(restored).toEqual(filters)
  })

  it('hasActiveFilters отличает фильтр от умолчания', () => {
    expect(hasActiveFilters(DEFAULT_MAP_FILTERS)).toBe(false)
    expect(hasActiveFilters({ ...DEFAULT_MAP_FILTERS, period: 'all' })).toBe(true)
  })
})

describe('isReportInPeriod', () => {
  it('«всё время» пропускает любой отчёт', () => {
    expect(isReportInPeriod('2020-01-01T00:00:00Z', 'all', NOW)).toBe(true)
  })

  it('граница 7 дней: ровно неделя назад — ещё видно, на минуту старше — нет', () => {
    expect(isReportInPeriod(daysAgo(7), '7d', NOW)).toBe(true)
    expect(
      isReportInPeriod(
        new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000 - 60_000).toISOString(),
        '7d',
        NOW,
      ),
    ).toBe(false)
  })

  it('битую дату не показывает', () => {
    expect(isReportInPeriod('не дата', 'all', NOW)).toBe(false)
  })
})

describe('filterReports', () => {
  const reports = [
    report({ category_user: 'basement_water', status: 'new', created_at: daysAgo(2) }),
    report({ category_user: 'damp_wall', status: 'triaged', created_at: daysAgo(10) }),
    report({ category_user: null, status: 'new', created_at: daysAgo(40) }),
  ]

  it('по умолчанию показывает свежие отчёты за 30 дней', () => {
    expect(filterReports(reports, DEFAULT_MAP_FILTERS, NOW)).toHaveLength(2)
  })

  it('фильтр по категории оставляет только выбранную', () => {
    const result = filterReports(reports, { ...DEFAULT_MAP_FILTERS, category: 'damp_wall' }, NOW)

    expect(result).toHaveLength(1)
    expect(result[0]!.category_user).toBe('damp_wall')
  })

  it('фильтры категории и статуса складываются', () => {
    const result = filterReports(
      reports,
      { category: 'basement_water', period: 'all', status: 'triaged' },
      NOW,
    )

    expect(result).toHaveLength(0)
  })

  it('«всё время» возвращает и старые отчёты', () => {
    expect(filterReports(reports, { ...DEFAULT_MAP_FILTERS, period: 'all' }, NOW)).toHaveLength(3)
  })
})
