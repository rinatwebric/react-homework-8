import { describe, expect, it } from 'vitest'
import { NO_DATA_FILL_HEX, RISK_FILL_HEX } from '../../../config/map'
import { RISK_LEVELS } from '../../../config/risk'
import { zoneFillColor, zoneStyle } from './zone-style'

describe('zoneStyle', () => {
  it('зона без данных серая и пунктирная: «нет данных» ≠ «норма»', () => {
    const style = zoneStyle(null)

    expect(style.fillColor).toBe(NO_DATA_FILL_HEX)
    expect(style.fillColor).not.toBe(RISK_FILL_HEX.normal)
    expect(style.dashArray).toBe('5 4')
  })

  it.each(RISK_LEVELS)('уровень %s берёт свой цвет и сплошную обводку', (level) => {
    const style = zoneStyle(level)

    expect(style.fillColor).toBe(RISK_FILL_HEX[level])
    expect(style.dashArray).toBeUndefined()
  })

  it('выбранная зона толще и плотнее', () => {
    const idle = zoneStyle('high', false)
    const selected = zoneStyle('high', true)

    expect(selected.weight).toBeGreaterThan(idle.weight ?? 0)
    expect(selected.fillOpacity).toBeGreaterThan(idle.fillOpacity ?? 0)
  })

  it('цвет риска не берётся для обводки: обводка всегда «чернильная»', () => {
    expect(zoneStyle('critical').color).not.toBe(RISK_FILL_HEX.critical)
  })
})

describe('zoneFillColor', () => {
  it('null → серый, уровень → цвет уровня', () => {
    expect(zoneFillColor(null)).toBe(NO_DATA_FILL_HEX)
    expect(zoneFillColor('elevated')).toBe(RISK_FILL_HEX.elevated)
  })
})