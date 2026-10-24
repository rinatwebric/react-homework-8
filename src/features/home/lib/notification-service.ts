import type { AlertItem } from '../../alerts/types'

const LAST_SEEN_KEY = 'suutech_alerts_last_seen'
const NOTIFIED_IDS_KEY = 'suutech_notified_alerts'

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
 * Запрос прав и отправка приветственного уведомления
 */
export async function requestNotificationPermissionAndWelcome(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted') {
      await showSystemNotification('SuuTech: Оповещения включены', {
        body: 'Вы будете получать оперативные сигналы об опасности подтопления.',
        tag: 'suutech-welcome',
      })
      return true
    }
    return false
  } catch (err) {
    console.warn('[notifications] Ошибка запроса прав:', err)
    return false
  }
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
