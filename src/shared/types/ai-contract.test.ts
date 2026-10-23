import { describe, expect, it } from 'vitest'
import { analyzeResponseSchema, assessmentSchema } from './ai-contract'

const VALID = {
  is_relevant: true,
  risk_level: 'medium',
  confidence: 0.72,
  findings: ['Влажное пятно у пола'],
  recommendations: ['Просушить помещение и проветрить'],
  disclaimer: 'Оценка по фото, не измерение.',
}

describe('ai-contract: схема оценки', () => {
  it('принимает валидный ответ модели', () => {
    const parsed = assessmentSchema.parse(VALID)
    expect(parsed.risk_level).toBe('medium')
    expect(parsed.confidence).toBeCloseTo(0.72)
  })

  it('не принимает уровень critical: по фото его не бывает', () => {
    expect(assessmentSchema.safeParse({ ...VALID, risk_level: 'critical' }).success).toBe(false)
  })

  it('не принимает уверенность вне диапазона 0…1', () => {
    expect(assessmentSchema.safeParse({ ...VALID, confidence: 1.4 }).success).toBe(false)
    expect(assessmentSchema.safeParse({ ...VALID, confidence: -0.1 }).success).toBe(false)
  })

  it('требует непустой дисклеймер', () => {
    expect(assessmentSchema.safeParse({ ...VALID, disclaimer: '   ' }).success).toBe(false)
  })

  it('принимает советы фермеру, если они пришли', () => {
    const parsed = assessmentSchema.safeParse({ ...VALID, water_tips: ['Отвести воду в канаву'] })
    expect(parsed.success).toBe(true)
  })
})

describe('ai-contract: ответ Edge Function', () => {
  it('разрешает пустой путь к фото (загрузка не удалась)', () => {
    const parsed = analyzeResponseSchema.parse({
      assessment: VALID,
      photo_path: null,
      model: null,
      cached: true,
      contract_version: '1.0',
    })
    expect(parsed.photo_path).toBeNull()
    expect(parsed.cached).toBe(true)
  })

  it('требует cached и contract_version', () => {
    expect(analyzeResponseSchema.safeParse({ assessment: VALID }).success).toBe(false)
  })
})