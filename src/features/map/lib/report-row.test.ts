import { describe, expect, it } from 'vitest'
import { parseMapReports } from './report-row'

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1',
    created_at: '2026-10-24T10:00:00Z',
    lat_public: 42.3479,
    lng_public: 76.1669,
    zone_id: 'kg-issyk-ton-ak-olong',
    category_user: 'basement_water',
    comment: 'Вода в подвале',
    immediate_danger: true,
    weather_snapshot: { temperature_c: 12.5, precipitation_mm: 1.2, humidity_pct: 78 },
    status: 'new',
    is_demo: false,
    ...overrides,
  }
}

describe('parseMapReports', () => {
  it('принимает валидный список v2 и не считает пропуски', () => {
    const result = parseMapReports([row(), row({ id: 'a2' })])

    expect(result.reports).toHaveLength(2)
    expect(result.skipped).toBe(0)
  })

  it('отчёт без категории и снимка погоды допустим: на карте он будет серым/дефолтным', () => {
    const { reports } = parseMapReports([
      row({ category_user: null, comment: null, weather_snapshot: null }),
    ])

    expect(reports[0]!.category_user).toBeNull()
    expect(reports[0]!.comment).toBeNull()
    expect(reports[0]!.weather_snapshot).toBeNull()
  })

  it('битую строку отбрасывает, остальные сохраняет', () => {
    const result = parseMapReports([row(), row({ lat_public: 142 })]) // широта 142 — данные испорчены

    expect(result.reports).toHaveLength(1)
    expect(result.skipped).toBe(1)
  })

  it('неизвестный или устаревший статус (reviewed) отбрасывает строку', () => {
    const result = parseMapReports([row({ status: 'reviewed' }), row({ status: 'deleted' })])

    expect(result.reports).toHaveLength(0)
    expect(result.skipped).toBe(2)
  })

  it('падает, если пришёл не список: это ошибка запроса, а не «пустая карта»', () => {
    expect(() => parseMapReports({ message: 'JWT expired' })).toThrow()
    expect(() => parseMapReports(null)).toThrow()
  })
})
