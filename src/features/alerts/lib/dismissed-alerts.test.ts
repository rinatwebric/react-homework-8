import { describe, expect, it } from 'vitest'
import type { AlertItem } from '../types'
import {
  DISMISSED_ALERTS_KEY,
  dismissAlert,
  filterUndismissedAlerts,
  getDismissedAlertIds,
  isAlertDismissed,
} from './dismissed-alerts'

function memoryStorage(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  }
}

describe('dismissed-alerts: скрытие предупреждений пользователем', () => {
  it('возвращает пустой массив при отсутствии сохраненных ID', () => {
    const storage = memoryStorage()
    expect(getDismissedAlertIds(storage)).toEqual([])
  })

  it('возвращает пустой массив при поврежденном JSON в storage', () => {
    const storage = memoryStorage({ [DISMISSED_ALERTS_KEY]: 'invalid-json{' })
    expect(getDismissedAlertIds(storage)).toEqual([])
  })

  it('сохраняет ID скрытого предупреждения в storage', () => {
    const storage = memoryStorage()
    dismissAlert('alert-1', storage)

    expect(getDismissedAlertIds(storage)).toEqual(['alert-1'])
    expect(isAlertDismissed('alert-1', storage)).toBe(true)
    expect(isAlertDismissed('alert-2', storage)).toBe(false)
  })

  it('не дублирует одинаковый ID при повторном вызове dismissAlert', () => {
    const storage = memoryStorage()
    dismissAlert('alert-1', storage)
    dismissAlert('alert-1', storage)

    expect(getDismissedAlertIds(storage)).toEqual(['alert-1'])
  })

  it('ограничивает количество сохраненных ID последними 50 записями', () => {
    const storage = memoryStorage()
    for (let i = 1; i <= 60; i++) {
      dismissAlert(`alert-${i}`, storage)
    }

    const saved = getDismissedAlertIds(storage)
    expect(saved.length).toBe(50)
    expect(saved[0]).toBe('alert-11')
    expect(saved[49]).toBe('alert-60')
  })

  it('фильтрует массив алертов, исключая скрытые пользователем', () => {
    const sampleAlerts: AlertItem[] = [
      {
        id: 'a1',
        level: 'critical',
        message: 'Опасность 1',
        area: 'Село',
        source: 'manual',
        created_at: '2026-10-25T01:00:00Z',
      },
      {
        id: 'a2',
        level: 'warning',
        message: 'Внимание 2',
        area: 'Село',
        source: 'manual',
        created_at: '2026-10-25T02:00:00Z',
      },
      {
        id: 'a3',
        level: 'info',
        message: 'Информация 3',
        area: 'Село',
        source: 'manual',
        created_at: '2026-10-25T03:00:00Z',
      },
    ]

    const result = filterUndismissedAlerts(sampleAlerts, ['a1'])
    expect(result.map((a) => a.id)).toEqual(['a2', 'a3'])

    // Если скрыты все — возвращает пустой массив
    const resultAll = filterUndismissedAlerts(sampleAlerts, ['a1', 'a2', 'a3'])
    expect(resultAll.length).toBe(0)

    // Если список скрытых пуст — возвращает исходный массив
    const resultNone = filterUndismissedAlerts(sampleAlerts, [])
    expect(resultNone.length).toBe(3)
  })
})
