import { describe, expect, it, beforeEach } from 'vitest'
import {
  countUnreadAlerts,
  markAlertsAsSeen,
  getAlertsLastSeen,
} from './notification-service'
import type { AlertItem } from '../../alerts/types'

describe('notification-service', () => {
  beforeEach(() => {
    const store = new Map<string, string>()
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => store.set(key, val),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size
      },
    }

    // Assign mock window & localStorage
    // @ts-ignore
    globalThis.window = {}
    // @ts-ignore
    globalThis.localStorage = mockStorage
  })

  it('correctly calculates unread alerts and marks them as seen', () => {
    const mockAlerts: AlertItem[] = [
      {
        id: '1',
        level: 'warning',
        area: 'Северная',
        message: 'Вода на дороге',
        created_at: new Date(Date.now() - 10000).toISOString(),
      },
      {
        id: '2',
        level: 'critical',
        area: 'Центр',
        message: 'Угроза подтопления',
        created_at: new Date(Date.now() - 5000).toISOString(),
      },
    ]

    // Initially lastSeen is 0, so both are unread
    expect(countUnreadAlerts(mockAlerts)).toBe(2)

    // Mark as seen
    markAlertsAsSeen()
    expect(getAlertsLastSeen()).toBeGreaterThan(0)

    // Now unread count is 0
    expect(countUnreadAlerts(mockAlerts)).toBe(0)

    // A brand new alert arrives later
    const futureAlert: AlertItem = {
      id: '3',
      level: 'info',
      message: 'Все спокойно',
      created_at: new Date(Date.now() + 1000).toISOString(),
    }

    expect(countUnreadAlerts([...mockAlerts, futureAlert])).toBe(1)
  })
})
