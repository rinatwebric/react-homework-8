import { describe, expect, it } from 'vitest'
import { toZoneRiskMap } from './zone-risk'

describe('toZoneRiskMap', () => {
  it('складывает строки в lookup по zone_id', () => {
    const levels = toZoneRiskMap([
      { zone_id: 'a', level: 'high', reasons: ['well 1.2 м'] },
      { zone_id: 'b', level: 'normal', reasons: [] },
    ])

    expect(levels.get('a')).toBe('high')
    expect(levels.get('b')).toBe('normal')
    expect(levels.size).toBe(2)
  })

  it('пустая таблица — пустая карта: все зоны будут серыми', () => {
    expect(toZoneRiskMap([]).size).toBe(0)
  })

  it('неизвестный уровень считается повреждённым ответом', () => {
    expect(() => toZoneRiskMap([{ zone_id: 'a', level: 'very-high', reasons: [] }])).toThrow()
  })

  it('падает на не-списке: это ошибка запроса, а не «нет данных»', () => {
    expect(() => toZoneRiskMap({ error: 'permission denied' })).toThrow()
  })
})