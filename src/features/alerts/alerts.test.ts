import { describe, expect, it } from 'vitest'
import { sortAlertsBySeverity } from './alerts-api'
import { alertItemSchema, type AlertItem } from './types'

describe('alerts parsing & sorting', () => {
  it('alertItemSchema нормализует уровни и валидирует поля', () => {
    const raw = {
      id: '11111111-1111-4111-8111-111111111111',
      created_at: '2026-10-25T01:00:00Z',
      level: 'critical',
      message: 'Угроза подтопления',
      area: 'Ак-Өлөң',
    }

    const parsed = alertItemSchema.parse(raw)
    expect(parsed.level).toBe('critical')
    expect(parsed.message).toBe('Угроза подтопления')
    expect(parsed.area).toBe('Ак-Өлөң')
  })

  it('нормализует legacy-уровни elevated и high в warning', () => {
    const elevated = alertItemSchema.parse({
      id: '22222222-2222-4222-8222-222222222222',
      created_at: '2026-10-25T01:00:00Z',
      level: 'elevated',
      message: 'Повышенный уровень',
    })
    expect(elevated.level).toBe('warning')

    const high = alertItemSchema.parse({
      id: '33333333-3333-4333-8333-333333333333',
      created_at: '2026-10-25T01:00:00Z',
      level: 'high',
      message: 'Высокий уровень',
    })
    expect(high.level).toBe('warning')
  })

  it('sortAlertsBySeverity ставит critical выше warning и info, а внутри — по дате', () => {
    const alerts: AlertItem[] = [
      {
        id: '1',
        created_at: '2026-10-25T01:00:00Z',
        level: 'info',
        message: 'Информация',
        area: 'Центр',
      },
      {
        id: '2',
        created_at: '2026-10-25T00:30:00Z',
        level: 'critical',
        message: 'ЧС старая',
        area: 'Север',
      },
      {
        id: '3',
        created_at: '2026-10-25T02:00:00Z',
        level: 'warning',
        message: 'Внимание',
        area: 'Юг',
      },
      {
        id: '4',
        created_at: '2026-10-25T01:30:00Z',
        level: 'critical',
        message: 'ЧС свежая',
        area: 'Восток',
      },
    ]

    const sorted = sortAlertsBySeverity(alerts)
    expect(sorted.map((a) => a.id)).toEqual(['4', '2', '3', '1'])
  })
})
