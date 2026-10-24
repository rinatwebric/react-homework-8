import { AlertOctagon, AlertTriangle, PhoneCall } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchRecentAlerts } from '../../alerts/alerts-api'
import type { AlertItem } from '../../alerts/types'

export function ActiveAlertBanner() {
  const { t } = useTranslation()
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  useEffect(() => {
    let isMounted = true
    void fetchRecentAlerts(24).then((data) => {
      if (isMounted) {
        setAlerts(data)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Ищем наиболее приоритетное предупреждение
  const primaryAlert = alerts.find((a) => a.level === 'critical' || a.level === 'warning')

  if (!primaryAlert) {
    return null
  }

  const isCritical = primaryAlert.level === 'critical'
  const timeFormatted = new Date(primaryAlert.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      role="alert"
      className={
        isCritical
          ? 'relative rounded-2xl border-2 border-rose-500 bg-rose-50 p-4 text-rose-950 shadow-md dark:border-rose-600 dark:bg-rose-950/60 dark:text-rose-100'
          : 'relative rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 shadow-md dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-100'
      }
    >
      <div className="flex items-start gap-3">
        <div
          className={
            isCritical
              ? 'grid size-10 shrink-0 place-items-center rounded-xl bg-rose-600 text-white shadow-xs'
              : 'grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white shadow-xs'
          }
        >
          {isCritical ? (
            <AlertOctagon aria-hidden className="size-6 animate-pulse" />
          ) : (
            <AlertTriangle aria-hidden className="size-6" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <span
              className={
                isCritical
                  ? 'text-xs font-black tracking-wider uppercase text-rose-700 dark:text-rose-300'
                  : 'text-xs font-black tracking-wider uppercase text-amber-800 dark:text-amber-300'
              }
            >
              {isCritical
                ? t('alerts.banner.criticalTitle', 'ОПЕРАТИВНОЕ ПРЕДУПРЕЖДЕНИЕ МЧС')
                : t('alerts.banner.warningTitle', 'ВНИМАНИЕ: ОПЕРАТИВНОЕ ПРЕДУПРЕЖДЕНИЕ')}
            </span>
            <span className="text-[11px] font-medium opacity-80">{timeFormatted}</span>
          </div>

          <p className="text-sm font-bold leading-snug">{primaryAlert.message}</p>

          {primaryAlert.area && (
            <p className="text-xs font-medium opacity-90">
              <span className="opacity-75">{t('alerts.areaLabel', 'Район')}:</span>{' '}
              {primaryAlert.area}
            </p>
          )}

          <div className="pt-1">
            {isCritical ? (
              <a
                href="tel:112"
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition-colors"
              >
                <PhoneCall className="size-3.5" />
                {t('alerts.banner.call112', 'Экстренный вызов 112')}
              </a>
            ) : (
              <p className="text-xs font-medium opacity-85">
                {t('alerts.banner.warningAdvice', 'Проверьте водоотводы, стоки и подвалы дома.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
