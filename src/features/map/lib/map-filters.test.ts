import { describe, expect, it } from 'vitest'
import {
  DEFAULT_MAP_FILTERS,
  filterReports,
  hasActiveFilters,
  isReportInPeriod,
  parseMapFilters,
  serializeMapFilters,
} from './map-filters'

const NOW = new Date('2026-10-24T12:00:00Z')

const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString()

function report(overrides: Partial<{ risk_level: 'low' | 'medium' | 'high' | null; created_at: string; status: 'new' | 'reviewed' | 'in_progress' | 'resolved' }> = {}) {
  return {
    risk_level: 'high' as const,
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
    const filters = parseMapFilters(new URLSearchParams('risk=huge&period=9999d&status=deleted'))

    expect(filters).toEqual(DEFAULT_MAP_FILTERS)
  })

  it('читает валидные параметры', () => {
    const filters = parseMapFilters(new URLSearchParams('risk=medium&period=7d&status=resolved'))

    expect(filters).toEqual({ risk: 'medium', period: '7d', status: 'resolved' })
  })
})

describe('serializeMapFilters', () => {
  it('не пишет значения по умолчанию в URL', () => {
    expect(serializeMapFilters(DEFAULT_MAP_FILTERS).toString()).toBe('')
  })

  it('переживает круговой обход URL → фильтры → URL', () => {
    const filters = { risk: 'high', period: '7d', status: 'new' } as const
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
    expect(isReportInPeriod(new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000 - 60_000).toISOString(), '7d', NOW)).toBe(false)
  })

  it('битую дату не показывает', () => {
    expect(isReportInPeriod('не дата', 'all', NOW)).toBe(false)
  })
})

describe('filterReports', () => {
  const reports = [
    report({ risk_level: 'high', status: 'new', created_at: daysAgo(2) }),
    report({ risk_level: 'medium', status: 'reviewed', created_at: daysAgo(10) }),
    report({ risk_level: null, status: 'new', created_at: daysAgo(40) }),
  ]

  it('по умолчанию показывает свежие отчёты за 30 дней', () => {
    expect(filterReports(reports, DEFAULT_MAP_FILTERS, NOW)).toHaveLength(2)
  })

  it('фильтр по риску оставляет только выбранный уровень', () => {
    const result = filterReports(reports, { ...DEFAULT_MAP_FILTERS, risk: 'medium' }, NOW)

    expect(result).toHaveLength(1)
    expect(result[0]!.risk_level).toBe('medium')
  })

  it('фильтры риска и статуса складываются', () => {
    const result = filterReports(
      reports,
      { risk: 'high', period: 'all', status: 'reviewed' },
      NOW,
    )

    expect(result).toHaveLength(0)
  })

  it('«всё время» возвращает и старые отчёты', () => {
    expect(filterReports(reports, { ...DEFAULT_MAP_FILTERS, period: 'all' }, NOW)).toHaveLength(3)
  })
})