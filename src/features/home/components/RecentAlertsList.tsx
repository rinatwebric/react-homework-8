import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AlertItem } from '../../alerts/types'
import { Card } from '../../../shared/ui/Card'
import { cx } from '../../../shared/lib/cx'
import {
  formatRelativeTime,
  getAlertsLastSeen,
  isPushSubscribed,
  markAlertsAsSeen,
  subscribeToPushNotifications,
} from '../lib/notification-service'

interface RecentAlertsListProps {
  alerts: AlertItem[]
  onMarkAllAsRead?: () => void
}

const MAX_VISIBLE = 5

export function RecentAlertsList({ alerts, onMarkAllAsRead }: RecentAlertsListProps) {
  const { t, i18n } = useTranslation()
  const [pushEnabled, setPushEnabled] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
  )
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false)
  const [showAll, setShowAll] = useState<boolean>(false)
  const [filter, setFilter] = useState<'all' | 'urgent'>('all')
  const [lastSeen, setLastSeen] = useState<number>(() => getAlertsLastSeen())

  // Синхронизация статуса Web Push подписки
  useEffect(() => {
    let isMounted = true
    void isPushSubscribed().then((subscribed) => {
      if (isMounted) {
        setPushEnabled(subscribed)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  const handleEnablePush = async () => {
    setIsSubscribing(true)
    try {
      const granted = await subscribeToPushNotifications()
      if (granted) {
        setPushEnabled(true)
      }
    } finally {
      setIsSubscribing(false)
    }
  }

  const handleMarkAllRead = () => {
    markAlertsAsSeen()
    setLastSeen(Date.now())
    onMarkAllAsRead?.()
  }

  // Фильтрация: все или только срочные (critical / warning)
  const filteredAlerts = useMemo(() => {
    if (filter === 'urgent') {
      return alerts.filter((a) => a.level === 'critical' || a.level === 'warning')
    }
    return alerts
  }, [alerts, filter])

  // Показываем максимум 5 по умолчанию
  const visibleAlerts = showAll ? filteredAlerts : filteredAlerts.slice(0, MAX_VISIBLE)
  const hasMore = filteredAlerts.length > MAX_VISIBLE
  const hiddenCount = filteredAlerts.length - MAX_VISIBLE

  const urgentCount = useMemo(
    () => alerts.filter((a) => a.level === 'critical' || a.level === 'warning').length,
    [alerts],
  )

  const unreadCount = useMemo(
    () => alerts.filter((a) => new Date(a.created_at).getTime() > lastSeen).length,
    [alerts, lastSeen],
  )

  return (
    <Card className="space-y-3.5 p-4 shadow-lg border border-slate-200 bg-white animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Шапка с действиями */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative grid size-8 place-items-center rounded-xl bg-blue-50 text-blue-700 shrink-0">
            <Bell className="size-4.5 text-blue-700" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-rose-600 ring-2 ring-white animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
              {t('alerts.recentTitle', 'Оповещения службы')}
            </h3>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate mt-0.5">
              <span>
                {alerts.length > 0
                  ? `${t('alerts.activeCount', 'Активных:')} ${alerts.length}${
                      unreadCount > 0 ? ` (${unreadCount} ${t('alerts.unreadBadge', 'новых')})` : ''
                    }`
                  : t('alerts.noActive', 'Нет новых')}
              </span>
              {pushEnabled && (
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-600" />
                  Push
                </span>
              )}
            </div>
          </div>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
            title={t('alerts.markAllRead', 'Прочитать все')}
          >
            <CheckCheck className="size-3.5" />
            <span>{t('alerts.markAllRead', 'Прочитать все')}</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 px-2 py-0.5">
            <Check className="size-3.5 text-emerald-600" />
            <span>{t('alerts.allRead', 'Все прочитаны')}</span>
          </span>
        )}
      </div>

      {/* Быстрые фильтры «Все» / «Только важные» */}
      {alerts.length > 1 && urgentCount > 0 && (
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cx(
              'flex-1 py-1.5 px-3 rounded-lg font-bold transition-all text-center',
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t('alerts.filterAll', 'Все')} ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('urgent')}
            className={cx(
              'flex-1 py-1.5 px-3 rounded-lg font-bold transition-all text-center',
              filter === 'urgent'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900',
            )}
          >
            {t('alerts.filterUrgent', 'Только важные')} ({urgentCount})
          </button>
        </div>
      )}

      {/* Список оповещений (максимум 5 по умолчанию) */}
      {filteredAlerts.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-700">
            <ShieldCheck className="size-5" />
          </div>
          <p className="text-xs font-medium text-slate-600 max-w-xs mx-auto">
            {t('alerts.emptyList', 'В селе Ак-Өлөң нет активных предупреждений. Ситуация стабильная.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleAlerts.map((alert) => {
            const isCrit = alert.level === 'critical'
            const isWarn = alert.level === 'warning'
            const isUnread = new Date(alert.created_at).getTime() > lastSeen
            const relativeTime = formatRelativeTime(alert.created_at, i18n.language)

            return (
              <div
                key={alert.id}
                className={cx(
                  'relative rounded-xl border p-3.5 text-xs transition-all duration-150',
                  isCrit
                    ? 'border-rose-200 border-l-[5px] border-l-rose-600 bg-rose-50/70 text-slate-900'
                    : isWarn
                      ? 'border-amber-200 border-l-[5px] border-l-amber-500 bg-amber-50/70 text-slate-900'
                      : 'border-sky-200 border-l-[5px] border-l-sky-600 bg-sky-50/70 text-slate-900',
                  isUnread && 'shadow-sm ring-1 ring-slate-300',
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={cx(
                      'inline-flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs',
                      isCrit
                        ? 'bg-rose-600 text-white'
                        : isWarn
                          ? 'bg-amber-500 text-white'
                          : 'bg-sky-600 text-white',
                    )}
                  >
                    {isCrit ? (
                      <AlertOctagon className="size-3.5 shrink-0" />
                    ) : isWarn ? (
                      <AlertTriangle className="size-3.5 shrink-0" />
                    ) : (
                      <Info className="size-3.5 shrink-0" />
                    )}
                    <span>{t(`alerts.levels.${alert.level}`)}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isUnread && (
                      <span className="size-2 rounded-full bg-blue-600 ring-2 ring-white" title="Новое" />
                    )}
                    <span className="text-[11px] font-bold text-slate-600">{relativeTime}</span>
                  </div>
                </div>

                <p className="font-extrabold text-[13px] leading-snug text-slate-900 mb-1">
                  {alert.message}
                </p>

                {alert.area && (
                  <p className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <span className="text-slate-500 font-normal">{t('alerts.areaLabel', 'Зона')}:</span>
                    <span>{alert.area}</span>
                  </p>
                )}
              </div>
            )
          })}

          {/* Кнопка раскрытия/сворачивания */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-xs font-bold text-slate-900 border border-slate-200 transition-colors"
            >
              {showAll ? (
                <>
                  <ChevronUp className="size-4" />
                  <span>
                    {t('alerts.showLess', {
                      count: MAX_VISIBLE,
                      defaultValue: `Свернуть до ${MAX_VISIBLE}`,
                    })}
                  </span>
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" />
                  <span>
                    {t('alerts.showMore', {
                      count: hiddenCount,
                      defaultValue: `Показать ещё ${hiddenCount}`,
                    })}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Если push ещё не включён — компактная понятная кнопка */}
      {!pushEnabled && (
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleEnablePush}
            disabled={isSubscribing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white py-2.5 px-3 text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubscribing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>{t('states.loading', 'Подключение…')}</span>
              </>
            ) : (
              <>
                <Bell className="size-4" />
                <span>{t('alerts.enablePush', 'Включить уведомления на телефоне')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </Card>
  )
}
