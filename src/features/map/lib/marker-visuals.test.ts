import { describe, expect, it } from 'vitest'
import { NO_DATA_FILL_HEX } from '../../../config/map'
import { CATEGORY_META, REPORT_CATEGORIES } from '../../../shared/lib/categories'
import { clusterSize, reportFillColor, reportNeedsAttention } from './marker-visuals'

describe('reportFillColor', () => {
  it('красит метку цветом соответствующей категории', () => {
    for (const cat of REPORT_CATEGORIES) {
      expect(reportFillColor(cat)).toBe(CATEGORY_META[cat].hex)
    }
  })

  it('отчёт без категории красится цветом отсутствия данных (серый)', () => {
    expect(reportFillColor(null)).toBe(NO_DATA_FILL_HEX)
  })
})

describe('clusterSize', () => {
  it('рассчитывает ступенчатый размер кластера', () => {
    expect(clusterSize(1)).toBe(34)
    expect(clusterSize(9)).toBe(34)
    expect(clusterSize(10)).toBe(42)
    expect(clusterSize(99)).toBe(42)
    expect(clusterSize(100)).toBe(50)
  })
})

describe('reportNeedsAttention', () => {
  it('требует внимания при флаге непосредственной опасности', () => {
    expect(reportNeedsAttention(true)).toBe(true)
    expect(reportNeedsAttention(false)).toBe(false)
  })
})
