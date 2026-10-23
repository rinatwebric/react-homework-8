import { describe, expect, it } from 'vitest'
import type { Assessment } from '../../../shared/types/ai-contract'
import { buildAssessmentView } from './assessment-view'

function assessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    is_relevant: true,
    risk_level: 'medium',
    confidence: 0.78,
    findings: ['Влажное пятно'],
    recommendations: ['Просушить'],
    disclaimer: 'Оценка по фото, не измерение.',
    ...overrides,
  }
}

describe('assessment-view: исход для экрана', () => {
  it('мапит оценку жителя в уровень зоны', () => {
    expect(buildAssessmentView(assessment({ risk_level: 'low' })).zoneLevel).toBe('normal')
    expect(buildAssessmentView(assessment({ risk_level: 'medium' })).zoneLevel).toBe('elevated')
    expect(buildAssessmentView(assessment({ risk_level: 'high' })).zoneLevel).toBe('high')
  })

  it('нерелевантное фото — отдельный исход, даже если риск high', () => {
    const view = buildAssessmentView(assessment({ is_relevant: false, risk_level: 'high' }))
    expect(view.outcome).toBe('irrelevant')
  })

  it('низкая уверенность просит переснять', () => {
    expect(buildAssessmentView(assessment({ confidence: 0.49 })).outcome).toBe('low_confidence')
    expect(buildAssessmentView(assessment({ confidence: 0.5 })).outcome).toBe('relevant')
  })

  it('округляет уверенность в проценты', () => {
    expect(buildAssessmentView(assessment({ confidence: 0.726 })).confidencePercent).toBe(73)
    expect(buildAssessmentView(assessment({ confidence: 1 })).confidencePercent).toBe(100)
    expect(buildAssessmentView(assessment({ confidence: 0 })).confidencePercent).toBe(0)
  })
})