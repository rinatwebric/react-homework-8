import { describe, expect, it } from 'vitest'
import { NO_DATA_FILL_HEX, RISK_FILL_HEX } from '../../../config/map'
import { RESIDENT_RISK_LEVELS } from '../../../config/risk'
import { clusterSize, reportFillColor, reportNeedsAttention } from './marker-visuals'

describe('reportFillColor', () => {
  it('переводит шкалу отчёта в шкалу зон', () => {
    expect(reportFillColor('low')).toBe(RISK_FILL_HEX.normal)
    expect(reportFillColor('medium')).toBe(RISK_FILL_HEX.elevated)
    expect(reportFillColor('high')).toBe(RISK_FILL_HEX.high)
  })

  it('отчёт без оценки — серый, а не «норма»', () => {
    expect(reportFillColor(null)).toBe(NO_DATA_FILL_HEX)
  })

  it('критический цвет по фото недостижим: его дают только правила зоны/датчиков', () => {
    for (const level of RESIDENT_RISK_LEVELS) {
      expect(reportFillColor(level)).not.toBe(RISK_FILL_HEX.critical)
    }
  })
})

describe('clusterSize', () => {
  it('растёт ступенями 34 → 42 → 50', () => {
    expect(clusterSize(2)).toBe(34)
    expect(clusterSize(9)).toBe(34)
    expect(clusterSize(10)).toBe(42)
    expect(clusterSize(99)).toBe(42)
    expect(clusterSize(100)).toBe(50)
    expect(clusterSize(4321)).toBe(50)
  })
})

describe('reportNeedsAttention', () => {
  it('внимание нужно при воде в подвале или высоком риске', () => {
    expect(reportNeedsAttention('low', true)).toBe(true)
    expect(reportNeedsAttention('high', false)).toBe(true)
    expect(reportNeedsAttention('low', false)).toBe(false)
    expect(reportNeedsAttention(null, false)).toBe(false)
  })
})