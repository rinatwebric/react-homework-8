import { describe, expect, it } from 'vitest'
import { isAlertable, isResidentRiskLevel, isRiskLevel, toZoneRisk, worstRisk } from './risk'

describe('risk: маппинг уровней', () => {
  it('переводит оценку жителя в уровень зоны', () => {
    expect(toZoneRisk('low')).toBe('normal')
    expect(toZoneRisk('medium')).toBe('elevated')
    expect(toZoneRisk('high')).toBe('high')
  })

  it('не выдаёт critical по фото жителя', () => {
    const zoneLevels = (['low', 'medium', 'high'] as const).map(toZoneRisk)
    expect(zoneLevels).not.toContain('critical')
  })
})

describe('risk: worstRisk', () => {
  it('возвращает худший уровень', () => {
    expect(worstRisk(['normal', 'elevated', 'high'])).toBe('high')
    expect(worstRisk(['critical', 'high'])).toBe('critical')
  })

  it('без сигналов остаётся норма', () => {
    expect(worstRisk([])).toBe('normal')
    expect(worstRisk(['normal'])).toBe('normal')
  })
})

describe('risk: валидация значений извне', () => {
  it('узнаёт уровни зоны', () => {
    expect(isRiskLevel('critical')).toBe(true)
    expect(isRiskLevel('unknown')).toBe(false)
    expect(isRiskLevel(null)).toBe(false)
  })

  it('узнаёт уровни отчёта жителя', () => {
    expect(isResidentRiskLevel('medium')).toBe(true)
    expect(isResidentRiskLevel('critical')).toBe(false)
  })
})

describe('risk: предупреждения', () => {
  it('предупреждаем начиная с elevated', () => {
    expect(isAlertable('normal')).toBe(false)
    expect(isAlertable('elevated')).toBe(true)
    expect(isAlertable('critical')).toBe(true)
  })
})