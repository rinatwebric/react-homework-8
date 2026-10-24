import type { AlertItem } from '../types'

export const DISMISSED_ALERTS_KEY = 'suutech_dismissed_alerts'
export const MAX_DISMISSED_ALERTS = 50

/**
 * Получить список идентификаторов скрытых пользователем предупреждений
 */
export function getDismissedAlertIds(
  storage: Pick<Storage, 'getItem'> = typeof window !== 'undefined' ? window.localStorage : (null as unknown as Storage),
): string[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(DISMISSED_ALERTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
      return parsed
    }
    return []
  } catch {
    return []
  }
}

/**
 * Проверить, скрыто ли предупреждение
 */
export function isAlertDismissed(
  alertId: string,
  storage?: Pick<Storage, 'getItem'>,
): boolean {
  return getDismissedAlertIds(storage).includes(alertId)
}

/**
 * Скрыть предупреждение и сохранить в localStorage
 */
export function dismissAlert(
  alertId: string,
  storage: Pick<Storage, 'getItem' | 'setItem'> = typeof window !== 'undefined' ? window.localStorage : (null as unknown as Storage),
): void {
  if (!storage || !alertId) return
  try {
    const current = getDismissedAlertIds(storage)
    if (!current.includes(alertId)) {
      const updated = [...current, alertId].slice(-MAX_DISMISSED_ALERTS)
      storage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(updated))
    }
  } catch {
    // ignore quota error
  }
}

/**
 * Отфильтровать предупреждения, исключив скрытые пользователем
 */
export function filterUndismissedAlerts(
  alerts: AlertItem[],
  dismissedIds: readonly string[],
): AlertItem[] {
  if (dismissedIds.length === 0) return alerts
  return alerts.filter((alert) => !dismissedIds.includes(alert.id))
}
