import { describe, expect, it } from 'vitest'
import { TriageSchema } from './triage-contract'

describe('TriageSchema', () => {
  it('принимает эталонный ответ AI-триажа', () => {
    const valid = {
      category: 'basement_water',
      urgency: 'high',
      summary: 'Вода в подвале частного дома глубиной 10 см.',
      recommended_action: 'Направить дежурного сотрудника для осмотра дренажа.',
      duplicate_group: 'geo-42.348-76.167-150',
      confidence: 0.85,
      needs_human_review: false,
    }

    const result = TriageSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe('basement_water')
      expect(result.data.urgency).toBe('high')
      expect(result.data.duplicate_group).toBe('geo-42.348-76.167-150')
    }
  })

  it('принимает null в duplicate_group', () => {
    const validNoDuplicates = {
      category: 'other',
      urgency: 'low',
      summary: 'Сырость на заборе.',
      recommended_action: 'Учесть при плановом объезде.',
      duplicate_group: null,
      confidence: 0.9,
      needs_human_review: false,
    }

    expect(TriageSchema.safeParse(validNoDuplicates).success).toBe(true)
  })

  it('отклоняет некорректную срочность', () => {
    const invalidUrgency = {
      category: 'standing_water',
      urgency: 'urgent', // недопустимое значение
      summary: 'Стоячая вода.',
      recommended_action: 'Очистить арык.',
      duplicate_group: null,
      confidence: 0.7,
      needs_human_review: false,
    }

    const result = TriageSchema.safeParse(invalidUrgency)
    expect(result.success).toBe(false)
  })

  it('отклоняет confidence вне диапазона 0..1', () => {
    const invalidConfidence = {
      category: 'well_level',
      urgency: 'medium',
      summary: 'Уровень воды в колодце снизился.',
      recommended_action: 'Проверить дебит колодца.',
      duplicate_group: null,
      confidence: 1.2, // > 1
      needs_human_review: true,
    }

    expect(TriageSchema.safeParse(invalidConfidence).success).toBe(false)
  })

  it('отклоняет пустой summary или summary длиннее 200 символов', () => {
    const emptySummary = {
      category: 'damp_wall',
      urgency: 'medium',
      summary: '',
      recommended_action: 'Осмотреть стену.',
      duplicate_group: null,
      confidence: 0.75,
      needs_human_review: false,
    }
    expect(TriageSchema.safeParse(emptySummary).success).toBe(false)

    const longSummary = {
      category: 'damp_wall',
      urgency: 'medium',
      summary: 'a'.repeat(201),
      recommended_action: 'Осмотреть стену.',
      duplicate_group: null,
      confidence: 0.75,
      needs_human_review: false,
    }
    expect(TriageSchema.safeParse(longSummary).success).toBe(false)
  })

  it('отклоняет recommended_action длиннее 160 символов', () => {
    const longAction = {
      category: 'drainage_issue',
      urgency: 'high',
      summary: 'Засор арыка.',
      recommended_action: 'x'.repeat(161),
      duplicate_group: null,
      confidence: 0.8,
      needs_human_review: false,
    }
    expect(TriageSchema.safeParse(longAction).success).toBe(false)
  })
})
