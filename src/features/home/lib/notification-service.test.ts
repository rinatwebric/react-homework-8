import { describe, expect, it, beforeEach, vi, afterEach } from 'vitest'
import {
  countUnreadAlerts,
  markAlertsAsSeen,
  getAlertsLastSeen,
  notifyNewAlerts,
  showSystemNotification,
  urlBase64ToUint8Array,
  isPushSubscribed,
  subscribeToPushNotifications,
  VAPID_PUBLIC_KEY,
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

  describe('urlBase64ToUint8Array', () => {
    it('корректно преобразует base64url в Uint8Array', () => {
      const arr = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      expect(arr).toBeInstanceOf(Uint8Array)
      expect(arr.length).toBe(65)
      expect(arr[0]).toBe(4) // uncompressed P-256 public key prefix 0x04
    })
  })

  describe('isPushSubscribed', () => {
    it('возвращает false при отсутствии поддержки PushManager', async () => {
      const result = await isPushSubscribed()
      expect(result).toBe(false)
    })

    it('возвращает true если подписка существует', async () => {
      // @ts-ignore
      globalThis.PushManager = {}
      // @ts-ignore
      globalThis.window.PushManager = {}
      // @ts-ignore
      globalThis.Notification = { permission: 'granted' }
      // @ts-ignore
      globalThis.window.Notification = { permission: 'granted' }
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.example.com' }),
            },
          }),
        },
      })

      const result = await isPushSubscribed()
      expect(result).toBe(true)
    })
  })

  describe('subscribeToPushNotifications', () => {
    it('возвращает false, если пользователь отклонил запрос разрешений', async () => {
      // @ts-ignore
      globalThis.Notification = {
        requestPermission: vi.fn().mockResolvedValue('denied'),
      }

      const result = await subscribeToPushNotifications()
      expect(result).toBe(false)
    })

    it('успешно подписывает на PushManager при выданном разрешении', async () => {
      const mockSub = {
        endpoint: 'https://push.test/sub-123',
        toJSON: () => ({ endpoint: 'https://push.test/sub-123', keys: { p256dh: 'abc', auth: 'def' } }),
      }
      const subscribeMock = vi.fn().mockResolvedValue(mockSub)
      const showNotifMock = vi.fn().mockResolvedValue(undefined)

      // @ts-ignore
      globalThis.PushManager = {}
      // @ts-ignore
      globalThis.window.PushManager = {}
      const notifMock = {
        requestPermission: vi.fn().mockResolvedValue('granted'),
        permission: 'granted',
      }
      // @ts-ignore
      globalThis.Notification = notifMock
      // @ts-ignore
      globalThis.window.Notification = notifMock
      vi.stubGlobal('navigator', {
        serviceWorker: {
          ready: Promise.resolve({
            pushManager: {
              getSubscription: vi.fn().mockResolvedValue(null),
              subscribe: subscribeMock,
            },
            showNotification: showNotifMock,
          }),
        },
      })

      const result = await subscribeToPushNotifications({ lat: 42.13, lng: 76.88 })
      expect(result).toBe(true)
      expect(subscribeMock).toHaveBeenCalledTimes(1)
    })
  })
})
