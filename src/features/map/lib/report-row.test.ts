import { describe, expect, it } from 'vitest'
import { parseMapReports } from './report-row'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    created_at: '2026-10-24T10:00:00Z',
    lat_public: 42.3479,
    lng_public: 76.1669,
    zone_id: 'kg-issyk-ton-ak-olong',
    risk_level: 'high',
    confidence: 0.82,
    water_in_basement: true,
    well_depth_m: 1.2,
    status: 'new',
    mode: 'resident',
    is_demo: false,
    ...overrides,
  }
}

describe('parseMapReports', () => {
  it('принимает валидный список и не считает пропуски', () => {
    const result = parseMapReports([row(), row({ id: 'a2' })])

    expect(result.reports).toHaveLength(2)
    expect(result.skipped).toBe(0)
  })

  it('отчёт без оценки допустим: на карте он будет серым', () => {
    const { reports } = parseMapReports([row({ risk_level: null, confidence: null, well_depth_m: null })])

    expect(reports[0]!.risk_level).toBeNull()
  })

  it('битую строку отбрасывает, остальные сохраняет', () => {
    const result = parseMapReports([row(), row({ lat_public: 142 })]) // широта 142 — данные испорчены

    expect(result.reports).toHaveLength(1)
    expect(result.skipped).toBe(1)
  })

  it('неизвестный статус отбрасывает строку, а не ломает карту', () => {
    const result = parseMapReports([row({ status: 'deleted' })])

    expect(result.reports).toHaveLength(0)
    expect(result.skipped).toBe(1)
  })

  it('падает, если пришёл не список: это ошибка запроса, а не «пустая карта»', () => {
    expect(() => parseMapReports({ message: 'JWT expired' })).toThrow()
    expect(() => parseMapReports(null)).toThrow()
  })
})