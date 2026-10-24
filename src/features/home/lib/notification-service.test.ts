import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import {
  countUnreadAlerts,
  markAlertsAsSeen,
  getAlertsLastSeen,
  notifyNewAlerts,
  showSystemNotification,
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

    // @ts-ignore
    globalThis.window = {
      localStorage: mockStorage,
    }
    // @ts-ignore
    globalThis.localStorage = mockStorage
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
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

    expect(countUnreadAlerts(mockAlerts)).toBe(2)

    markAlertsAsSeen()
    expect(getAlertsLastSeen()).toBeGreaterThan(0)
    expect(countUnreadAlerts(mockAlerts)).toBe(0)

    const futureAlert: AlertItem = {
      id: '3',
      level: 'info',
      message: 'Все спокойно',
      created_at: new Date(Date.now() + 1000).toISOString(),
    }

    expect(countUnreadAlerts([...mockAlerts, futureAlert])).toBe(1)
  })

  describe('notifyNewAlerts', () => {
    it('не отправляет уведомление, если права не предоставлены', async () => {
      // @ts-ignore
      globalThis.Notification = { permission: 'default' }

      const alerts: AlertItem[] = [
        {
          id: 'alert-1',
          level: 'critical',
          message: 'Эвакуация',
          created_at: new Date().toISOString(),
        },
      ]

      const result = await notifyNewAlerts(alerts)
      expect(result).toBe(false)
    })

    it('отправляет уведомление о новом алерте и запоминает его id', async () => {
      const showNotifMock = vi.fn().mockResolvedValue(undefined)

      const notifMock = { permission: 'granted' }
      // @ts-ignore
      globalThis.Notification = notifMock
      // @ts-ignore
      globalThis.window.Notification = notifMock
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            showNotification: showNotifMock,
          }),
        },
      })

      const alerts: AlertItem[] = [
        {
          id: 'alert-unique-123',
          level: 'critical',
          area: 'с. Ак-Өлөң',
          message: 'Подтопление улицы',
          created_at: new Date().toISOString(),
        },
      ]

      const result = await notifyNewAlerts(alerts)
      expect(result).toBe(true)
      expect(showNotifMock).toHaveBeenCalledTimes(1)
      const firstCall = showNotifMock.mock.calls[0]
      expect(firstCall?.[0]).toContain('ЧС / Опасность!')
      expect(firstCall?.[1]?.body).toContain('Подтопление улицы')

      // Повторный вызов не дублирует уведомление
      const secondResult = await notifyNewAlerts(alerts)
      expect(secondResult).toBe(false)
      expect(showNotifMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('showSystemNotification', () => {
    it('возвращает false, если Notification недоступен', async () => {
      // @ts-ignore
      delete globalThis.Notification
      // @ts-ignore
      delete globalThis.window.Notification
      const sent = await showSystemNotification('Тест')
      expect(sent).toBe(false)
    })

    it('показывает уведомление через Service Worker', async () => {
      const showNotif = vi.fn().mockResolvedValue(undefined)
      const notifMock = { permission: 'granted' }
      // @ts-ignore
      globalThis.Notification = notifMock
      // @ts-ignore
      globalThis.window.Notification = notifMock
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({ showNotification: showNotif }),
        },
      })

      const sent = await showSystemNotification('Внимание', { body: 'Проверка' })
      expect(sent).toBe(true)
      expect(showNotif).toHaveBeenCalledWith(
        'Внимание',
        expect.objectContaining({
          body: 'Проверка',
          icon: '/pwa-192x192.png',
        }),
      )
    })
  })
})
