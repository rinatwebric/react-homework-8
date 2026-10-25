import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  BellRing,
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
  showSystemNotification,
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
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false)
  const [testSent, setTestSent] = useState<boolean>(false)
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

  const handleTestNotification = async () => {
    setIsTestingPush(true)
    try {
      await showSystemNotification('⚠️ SuuTech: Тестовый сигнал', {
        body: 'Уведомления на телефоне настроены и работают штатно.',
        tag: `test-signal-${Date.now()}`,
        data: { url: '/' },
      })
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    } finally {
      setIsTestingPush(false)
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

  // Показываем максимум 5 по умолчанию, как в современных мобильных приложениях
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
    <Card className="space-y-3.5 p-4 shadow-lg border border-border/80 bg-card/95 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Заголовок с действиями в стиле iOS / Android Notification Center */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative grid size-7 place-items-center rounded-lg bg-brand/10 text-brand">
            <Bell className="size-4 text-brand" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-rose-600 ring-2 ring-card animate-pulse" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-ink leading-tight">
              {t('alerts.recentTitle', 'Оповещения службы')}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {alerts.length > 0
                ? `${t('alerts.activeCount', 'Активных:')} ${alerts.length}${
                    unreadCount > 0 ? ` (${unreadCount} ${t('alerts.unreadBadge', 'новых')})` : ''
                  }`
                : t('alerts.noActive', 'Нет новых')}
            </p>
          </div>
        </div>

        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg text-brand hover:bg-brand/10 transition-colors"
            title={t('alerts.markAllRead', 'Прочитать все')}
          >
            <CheckCheck className="size-3.5" />
            <span>{t('alerts.markAllRead', 'Прочитать все')}</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground px-2 py-0.5">
            <Check className="size-3 text-emerald-600" />
            <span>{t('alerts.allRead', 'Все прочитаны')}</span>
          </span>
        )}
      </div>

      {/* Фильтр: «Все» / «Только важные» при наличии разного уровня оповещений */}
      {alerts.length > 1 && urgentCount > 0 && (
        <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cx(
              'flex-1 py-1 px-2.5 rounded-lg font-semibold transition-all text-center',
              filter === 'all'
                ? 'bg-card text-ink shadow-sm'
                : 'text-muted-foreground hover:text-ink',
            )}
          >
            {t('alerts.filterAll', 'Все')} ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('urgent')}
            className={cx(
              'flex-1 py-1 px-2.5 rounded-lg font-semibold transition-all text-center',
              filter === 'urgent'
                ? 'bg-card text-ink shadow-sm'
                : 'text-muted-foreground hover:text-ink',
            )}
          >
            {t('alerts.filterUrgent', 'Только важные')} ({urgentCount})
          </button>
        </div>
      )}

      {/* Список оповещений (до 5 по умолчанию) */}
      {filteredAlerts.length === 0 ? (
        <div className="py-6 text-center space-y-2">
          <div className="mx-auto grid size-10 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
            <ShieldCheck className="size-5" />
          </div>
          <p className="text-xs font-medium text-muted-foreground max-w-xs mx-auto">
            {t('alerts.emptyList', 'В селе Ак-Өлөң нет активных предупреждений. Ситуация стабильная.')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleAlerts.map((alert) => {
            const isCrit = alert.level === 'critical'
            const isWarn = alert.level === 'warning'
            const isUnread = new Date(alert.created_at).getTime() > lastSeen
            const relativeTime = formatRelativeTime(alert.created_at, i18n.language)

            return (
              <div
                key={alert.id}
                className={cx(
                  'relative rounded-xl border p-3 text-xs transition-all duration-150',
                  isCrit
                    ? 'border-rose-300/90 bg-rose-50/90 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-100'
                    : isWarn
                      ? 'border-amber-300/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100'
                      : 'border-sky-300/90 bg-sky-50/90 text-sky-950 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100',
                  isUnread && 'ring-1 ring-brand/40 shadow-sm',
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1 font-bold">
                  <span className="inline-flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    {isCrit ? (
                      <AlertOctagon className="size-3.5 text-rose-600 shrink-0" />
                    ) : isWarn ? (
                      <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                    ) : (
                      <Info className="size-3.5 text-sky-600 shrink-0" />
                    )}
                    <span>{t(`alerts.levels.${alert.level}`)}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    {isUnread && (
                      <span className="size-2 rounded-full bg-brand" title="Новое" />
                    )}
                    <span className="text-[10px] font-medium opacity-75">{relativeTime}</span>
                  </div>
                </div>

                <p className="font-semibold leading-snug">{alert.message}</p>

                {alert.area && (
                  <p className="mt-1.5 text-[11px] opacity-80 flex items-center gap-1">
                    <span className="opacity-60">{t('alerts.areaLabel', 'Зона')}:</span>
                    <span className="font-medium">{alert.area}</span>
                  </p>
                )}
              </div>
            )
          })}

          {/* Кнопка раскрытия/сворачивания, если оповещений больше 5 */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-muted/50 hover:bg-muted text-xs font-semibold text-ink transition-colors"
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
                      defaultValue: `Показать ещё ${hiddenCount} оповещений`,
                    })}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Блок управления Web Push уведомлениями */}
      <div className="pt-2 border-t border-border/60">
        {pushEnabled ? (
          <div className="flex items-center justify-between gap-2 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl p-2.5">
            <div className="min-w-0 flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200 leading-tight">
                  {t('alerts.notificationsEnabled', 'Push-уведомления включены')}
                </p>
                <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 truncate">
                  {t('alerts.pushActiveDesc', 'Приходят даже при закрытом приложении')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestNotification}
              disabled={isTestingPush}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-sm transition-colors disabled:opacity-50"
              title={t('alerts.testPhonePush', 'Проверить сигнал')}
            >
              {isTestingPush ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <BellRing className="size-3" />
              )}
              <span>
                {testSent ? t('alerts.testSent', 'Отправлено') : t('alerts.testPhonePush', 'Тест')}
              </span>
            </button>
          </div>
        ) : (
          <div className="bg-muted/40 border border-border/70 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2.5">
              <div className="grid size-7 place-items-center rounded-lg bg-amber-500/10 text-amber-600 shrink-0 mt-0.5">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink leading-snug">
                  {t('alerts.enablePush', 'Включить уведомления на телефоне')}
                </p>
                <p className="text-[11px] text-muted-foreground leading-normal mt-0.5">
                  {t(
                    'alerts.pushInactiveDesc',
                    'Включите уведомления, чтобы получать оперативные сигналы об опасности даже при закрытом приложении',
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isSubscribing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand/90 text-white py-2.5 px-3 text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t('states.loading', 'Подключение…')}</span>
                </>
              ) : (
                <>
                  <Bell className="size-3.5" />
                  <span>{t('alerts.enablePush', 'Включить уведомления на телефоне')}</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </Card>
  )
}
