import type { AlertItem } from '../../alerts/types'
import { supabaseConfig } from '../../../shared/lib/supabase'

const LAST_SEEN_KEY = 'suutech_alerts_last_seen'
const NOTIFIED_IDS_KEY = 'suutech_notified_alerts'
export const PUSH_SUBSCRIBED_KEY = 'suutech_push_subscribed'

export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BDLVOmmhZ9LoC0l8EOFKPIj3v9HXOKhY6-vZu10HF6S32beI3ZqcOWjgtpfjLGBNl3L2Rs_2NNJeFW9TaXB1Or8'

/**
 * Преобразование base64url публичного VAPID ключа в Uint8Array для PushManager
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new ArrayBuffer(rawData.length)
  const outputArray = new Uint8Array(buffer)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Проверить, активна ли подписка на Web Push
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
  const hasPush = typeof window.PushManager !== 'undefined' || typeof PushManager !== 'undefined'
  if (!hasPush) return false
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return Boolean(sub)
  } catch {
    return false
  }
}

/**
 * Бесшумная фоновая синхронизация Web Push подписки, если пользователь уже выдал разрешение
 */
export async function syncPushSubscriptionIfGranted(coords?: {
  lat: number
  lng: number
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false
  if (Notification.permission !== 'granted') return false
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return false
  const hasPush = typeof window.PushManager !== 'undefined' || typeof PushManager !== 'undefined'
  if (!hasPush) return false

  try {
    const reg = await navigator.serviceWorker.ready
    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })
    }

    if (subscription) {
      if (supabaseConfig) {
        const subscribeUrl = `${supabaseConfig.url.replace(/\/+$/, '')}/functions/v1/subscribe-push`
        await fetch(subscribeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: supabaseConfig.anonKey,
          },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            area_lat: coords?.lat !== undefined ? Number(coords.lat.toFixed(2)) : null,
            area_lng: coords?.lng !== undefined ? Number(coords.lng.toFixed(2)) : null,
            zone_id: 'ak-olong',
            lang: 'ru',
          }),
        }).catch((err) => {
          console.warn('[notifications] Ошибка отправки подписки в Edge Function:', err)
        })
      }
      try {
        localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true')
      } catch {
        // ignore
      }
      return true
    }
    return false
  } catch (err) {
    console.warn('[notifications] Ошибка фоновой синхронизации push:', err)
    return false
  }
}

/**
 * Оформить реальную Web Push подписку на системные уведомления
 * (уведомления будут приходить даже при закрытом/свёрнутом приложении)
 */
export async function subscribeToPushNotifications(coords?: {
  lat: number
  lng: number
}): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return false

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return false
    }

    // Если PushManager не поддерживается (например, Safari на iOS вне standalone-режима PWA)
    const hasPush = typeof window.PushManager !== 'undefined' || typeof PushManager !== 'undefined'
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !hasPush) {
      await showSystemNotification('SuuTech: Оповещения включены', {
        body: 'Локальные оповещения активированы в браузере.',
        tag: 'suutech-welcome',
      })
      return true
    }

    const reg = await navigator.serviceWorker.ready
    let subscription = await reg.pushManager.getSubscription()

    if (!subscription) {
      const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      })
    }

    if (subscription && supabaseConfig) {
      const subscribeUrl = `${supabaseConfig.url.replace(/\/+$/, '')}/functions/v1/subscribe-push`
      await fetch(subscribeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseConfig.anonKey,
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          area_lat: coords?.lat !== undefined ? Number(coords.lat.toFixed(2)) : null,
          area_lng: coords?.lng !== undefined ? Number(coords.lng.toFixed(2)) : null,
          zone_id: 'ak-olong',
          lang: 'ru',
        }),
      }).catch((err) => {
        console.warn('[notifications] Ошибка отправки подписки в Edge Function:', err)
      })
    }

    try {
      localStorage.setItem(PUSH_SUBSCRIBED_KEY, 'true')
    } catch {
      // ignore
    }

    await showSystemNotification('SuuTech: Оповещения включены', {
      body: 'Вы будете получать оперативные сигналы об опасности даже при закрытом приложении.',
      tag: 'suutech-welcome',
    })

    return true
  } catch (err) {
    console.warn('[notifications] Ошибка оформления Web Push подписки:', err)
    return false
  }
}


/**
 * Получить timestamp последнего просмотра оповещений пользователем
 */
export function getAlertsLastSeen(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY)
    return raw ? Number(raw) || 0 : 0
  } catch {
    return 0
  }
}

/**
 * Пометить все текущие оповещения как прочитанные
 */
export function markAlertsAsSeen(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()))
  } catch {
    // ignore storage quota / sandbox error
  }
}

/**
 * Посчитать количество непрочитанных оповещений
 */
export function countUnreadAlerts(alerts: AlertItem[]): number {
  const lastSeen = getAlertsLastSeen()
  return alerts.filter((alert) => {
    const created = new Date(alert.created_at).getTime()
    return created > lastSeen
  }).length
}

/**
 * Форматирование относительного времени для оповещений в стиле современных приложений
 */
export function formatRelativeTime(isoString: string, lang = 'ru'): string {
  const timestamp = new Date(isoString).getTime()
  if (Number.isNaN(timestamp)) return ''

  const now = Date.now()
  const diffSec = Math.max(0, Math.floor((now - timestamp) / 1000))

  if (diffSec < 60) {
    return lang === 'ky' ? 'Жаңы эле' : 'Только что'
  }

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) {
    return lang === 'ky' ? `${diffMin} мүн мурун` : `${diffMin} мин назад`
  }

  const diffHours = Math.floor(diffMin / 60)
  const dateObj = new Date(timestamp)
  const nowDate = new Date(now)

  const isToday =
    dateObj.getDate() === nowDate.getDate() &&
    dateObj.getMonth() === nowDate.getMonth() &&
    dateObj.getFullYear() === nowDate.getFullYear()

  const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  if (isToday) {
    if (diffHours < 4) {
      return lang === 'ky' ? `${diffHours} саат мурун` : `${diffHours} ч назад`
    }
    return lang === 'ky' ? `Бүгүн, ${timeStr}` : `Сегодня, ${timeStr}`
  }

  const yesterday = new Date(now - 24 * 60 * 60 * 1000)
  const isYesterday =
    dateObj.getDate() === yesterday.getDate() &&
    dateObj.getMonth() === yesterday.getMonth() &&
    dateObj.getFullYear() === yesterday.getFullYear()

  if (isYesterday) {
    return lang === 'ky' ? `Кечээ, ${timeStr}` : `Вчера, ${timeStr}`
  }

  const dateStr = dateObj.toLocaleDateString(lang === 'ky' ? 'ky-KG' : 'ru-RU', {
    day: 'numeric',
    month: 'short',
  })
  return `${dateStr}, ${timeStr}`
}

/**
 * Показать мобильное системное PWA-уведомление через ServiceWorkerRegistration.
 * Безопасно на Android Chrome, iOS standalone и десктопах (не бросает Illegal constructor).
 */
export async function showSystemNotification(
  title: string,
  options?: NotificationOptions & { vibrate?: number[] },
): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  const notificationOptions = {
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    ...options,
  }

  try {
    if ('serviceWorker' in navigator) {
      try {
        // Защита от вечного зависания ready: таймаут 1.5 секунды
        const swReadyPromise = navigator.serviceWorker.ready
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1500))
        const reg = await Promise.race([swReadyPromise, timeoutPromise])

        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, notificationOptions)
          return true
        }
      } catch (swErr) {
        console.warn('[notifications] Ошибка SW при показе уведомления:', swErr)
      }
    }

    // Fallback на стандартный конструктор Notification для десктопов
    new Notification(title, notificationOptions)
    return true
  } catch (err) {
    console.warn('[notifications] Ошибка отправки системного уведомления:', err)
    return false
  }
}

/**
 * Запрос прав и оформление Web Push подписки с приветственным уведомлением
 */
export async function requestNotificationPermissionAndWelcome(): Promise<boolean> {
  return subscribeToPushNotifications()
}

/**
 * Проверка новых критических/предупредительных алертов и вызов push-уведомления
 */
export async function notifyNewAlerts(alerts: AlertItem[]): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  if (alerts.length === 0) return false

  let notifiedIds: string[] = []
  try {
    const raw = localStorage.getItem(NOTIFIED_IDS_KEY)
    if (raw) notifiedIds = JSON.parse(raw) as string[]
  } catch {
    notifiedIds = []
  }

  // Свежие алерты за последние 24 часа, которые ещё не уведомляли пользователя
  const cutoff24h = Date.now() - 24 * 60 * 60 * 1000
  const newAlerts = alerts.filter((a) => {
    if (notifiedIds.includes(a.id)) return false
    const createdTime = new Date(a.created_at).getTime()
    return !Number.isNaN(createdTime) && createdTime > cutoff24h
  })

  if (newAlerts.length === 0) return false

  // Уведомляем о самом свежем
  const latest = newAlerts[0]
  if (!latest) return false

  const levelText =
    latest.level === 'critical'
      ? 'ЧС / Опасность!'
      : latest.level === 'warning'
        ? 'Внимание!'
        : 'Информация'

  const sent = await showSystemNotification(`SuuTech: ${levelText}`, {
    body: `${latest.area ? `[${latest.area}] ` : ''}${latest.message}`,
    tag: `suutech-alert-${latest.id}`,
    data: { url: '/' },
  })

  // Запоминаем отправленные ID
  const updated = Array.from(new Set([...notifiedIds, ...newAlerts.map((a) => a.id)]))
  try {
    localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify(updated.slice(-50)))
  } catch {
    // ignore
  }

  return sent
}
