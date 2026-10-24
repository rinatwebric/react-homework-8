import { CloudUpload, RefreshCw, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../../shared/lib/cx'
import { useOfflineQueue } from '../hooks/useOfflineQueue'

export function NetworkStatusBar() {
  const { t } = useTranslation()
  const { isOnline, queuedCount, isSyncing, syncNow } = useOfflineQueue()

  if (isOnline && queuedCount === 0 && !isSyncing) {
    return null
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        'relative z-30 mb-3 flex items-center justify-between gap-2.5 rounded-2xl px-3.5 py-2.5 text-xs font-semibold shadow-xs transition-colors',
        !isOnline
          ? 'border border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200'
          : 'border border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-700/60 dark:bg-sky-950/40 dark:text-sky-200',
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {!isOnline ? (
          <WifiOff aria-hidden className="size-4 shrink-0 text-amber-700 dark:text-amber-400" />
        ) : isSyncing ? (
          <RefreshCw aria-hidden className="size-4 shrink-0 animate-spin text-sky-700 dark:text-sky-400" />
        ) : (
          <CloudUpload aria-hidden className="size-4 shrink-0 text-sky-700 dark:text-sky-400" />
        )}

        <span className="truncate">
          {!isOnline ? (
            queuedCount > 0
              ? `${t('offline.noConnection', 'Нет подключения к сети')} · ${t('offline.inQueue', 'В очереди: {{count}}', { count: queuedCount })}`
              : t('offline.noConnection', 'Нет подключения к сети')
          ) : isSyncing ? (
            t('offline.syncing', 'Отправка сохранённых заявок...')
          ) : (
            t('offline.inQueue', 'В очереди на отправку: {{count}}', { count: queuedCount })
          )}
        </span>
      </div>

      {isOnline && queuedCount > 0 && !isSyncing && (
        <button
          type="button"
          onClick={() => void syncNow()}
          className="shrink-0 rounded-lg bg-sky-200/80 px-2 py-1 text-[11px] font-bold text-sky-950 hover:bg-sky-300 transition-colors"
        >
          {t('offline.sendNow', 'Отправить')}
        </button>
      )}
    </div>
  )
}
