import { AlertOctagon, AlertTriangle, Bell, Check, Info, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AlertItem } from '../../alerts/types'
import { Card } from '../../../shared/ui/Card'
import { cx } from '../../../shared/lib/cx'
import {
  isPushSubscribed,
  subscribeToPushNotifications,
} from '../lib/notification-service'

interface RecentAlertsListProps {
  alerts: AlertItem[]
}

export function RecentAlertsList({ alerts }: RecentAlertsListProps) {
  const { t } = useTranslation()
  const [pushEnabled, setPushEnabled] = useState<boolean>(
    typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
  )
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false)

  useEffect(() => {
    // Если пользователь уже разрешил уведомления, гарантируем регистрацию в PushManager и Edge Function
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      void isPushSubscribed().then((subscribed) => {
        if (!subscribed) {
          void subscribeToPushNotifications()
        }
      })
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

  return (
    <Card className="space-y-3 p-4 shadow-md border border-border">
      <div className="flex items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-brand" />
          <h3 className="text-sm font-bold text-ink">
            {t('alerts.recentTitle', 'Оповещения службы')}
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-muted-foreground">
          {alerts.length > 0
            ? `${t('alerts.activeCount', 'Активных:')} ${alerts.length}`
            : t('alerts.noActive', 'Нет новых')}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="py-2 text-center text-xs text-muted-foreground">
          {t('alerts.emptyList', 'В селе Ак-Өлөң нет активных предупреждений. Ситуация стабильная.')}
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => {
            const isCrit = alert.level === 'critical'
            const isWarn = alert.level === 'warning'
            const timeStr = new Date(alert.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={alert.id}
                className={cx(
                  'rounded-xl border p-3 text-xs transition-colors',
                  isCrit
                    ? 'border-rose-300 bg-rose-50/80 text-rose-950 dark:border-rose-900/60'
                    : isWarn
                      ? 'border-amber-300 bg-amber-50/80 text-amber-950 dark:border-amber-900/60'
                      : 'border-sky-300 bg-sky-50/80 text-sky-950 dark:border-sky-900/60',
                )}
              >
                <div className="flex items-center justify-between gap-1 mb-1 font-bold">
                  <span className="inline-flex items-center gap-1 uppercase tracking-wider text-[10px]">
                    {isCrit ? (
                      <AlertOctagon className="size-3 text-rose-600" />
                    ) : isWarn ? (
                      <AlertTriangle className="size-3 text-amber-600" />
                    ) : (
                      <Info className="size-3 text-sky-600" />
                    )}
                    {t(`alerts.levels.${alert.level}`)}
                  </span>
                  <span className="text-[10px] opacity-75">{timeStr}</span>
                </div>

                <p className="font-semibold leading-snug">{alert.message}</p>

                {alert.area && (
                  <p className="mt-1 text-[11px] opacity-80">
                    <span className="opacity-70">{t('alerts.areaLabel', 'Зона')}:</span> {alert.area}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {typeof window !== 'undefined' && 'Notification' in window && (
        <div className="pt-1 border-t border-border/50">
          {pushEnabled ? (
            <p className="text-[11px] font-medium text-emerald-600 flex items-center justify-center gap-1.5 py-1">
              <Check className="size-3.5" />
              {t('alerts.notificationsEnabled', 'Push-уведомления включены')}
            </p>
          ) : (
            <button
              type="button"
              onClick={handleEnablePush}
              disabled={isSubscribing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-muted/70 hover:bg-muted py-2 text-xs font-semibold text-ink transition-colors disabled:opacity-50"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>{t('states.loading', 'Подключение…')}</span>
                </>
              ) : (
                <span>{t('alerts.enablePush', 'Включить уведомления на телефоне')}</span>
              )}
            </button>
          )}
        </div>
      )}
    </Card>
  )
}
