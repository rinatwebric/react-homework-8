import {
  AlertOctagon,
  AlertTriangle,
  BellRing,
  Info,
  RefreshCw,
  Send,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createAlert, fetchAllAlerts } from '../../alerts/alerts-api'
import type { AlertItem, AlertLevel } from '../../alerts/types'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { cx } from '../../../shared/lib/cx'
import { getStoredModeratorToken, getValidModeratorToken } from '../admin-api'
import { showSystemNotification } from '../../home/lib/notification-service'

type AdminAlertsTabProps = {
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
}

export function AdminAlertsTab({ onNotify }: AdminAlertsTabProps) {
  const { t } = useTranslation()

  // Форма отправки
  const [level, setLevel] = useState<AlertLevel>('warning')
  const [area, setArea] = useState<string>('с. Ак-Өлөң (Иссык-Куль)')
  const [message, setMessage] = useState<string>('')
  const [isSending, setIsSending] = useState<boolean>(false)

  // История алертов
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isTestingPush, setIsTestingPush] = useState<boolean>(false)

  const handleSendTestPush = async () => {
    setIsTestingPush(true)
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          const perm = await Notification.requestPermission()
          if (perm !== 'granted') {
            onNotify('error', t('admin.alerts.pushPermissionDenied', 'Разрешение на уведомления отклонено в браузере'))
            return
          }
        }

        const sent = await showSystemNotification('⚠️ SuuTech ТЕСТ: Угроза подтопления', {
          body: 'Учебная тревога: подъем уровня грунтовых вод в селе Ак-Өлөң. Проверьте подвалы.',
          tag: `test-push-${Date.now()}`,
          data: { url: '/' },
        })

        if (sent) {
          onNotify('success', t('admin.alerts.testPushSent', 'Тестовое уведомление доставлено на устройство'))
        } else {
          onNotify('error', t('admin.alerts.testPushFailed', 'Не удалось отобразить уведомление (проверьте настройки PWA)'))
        }
      } else {
        onNotify('error', t('admin.alerts.pushNotSupported', 'Push-уведомления не поддерживаются в этом браузере'))
      }
    } finally {
      setIsTestingPush(false)
    }
  }

  // Храним onNotify в ref, чтобы исключить каскадные ре-рендеры и зацикливание вызовов
  const onNotifyRef = useRef(onNotify)
  useEffect(() => {
    onNotifyRef.current = onNotify
  })

  const loadAlerts = useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getValidModeratorToken().catch(() => getStoredModeratorToken())
      const data = await fetchAllAlerts(token)
      setAlerts(data)
    } catch (err) {
      console.warn('[admin-alerts] Ошибка загрузки истории:', err)
      onNotifyRef.current('error', t('admin.alerts.loadError', 'Ошибка загрузки предупреждений'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setIsSending(true)
    try {
      const token = await getValidModeratorToken()

      const created = await createAlert(
        {
          level,
          area: area.trim(),
          message: message.trim(),
        },
        token,
      )

      onNotify(
        'success',
        t('admin.alerts.sentSuccess', 'Предупреждение отправлено'),
        `${t(`alerts.levels.${level}`)}: ${created.area ?? ''}`,
      )
      setMessage('')
      await loadAlerts()

      // Также пытаемся отправить локальное мобильное уведомление на текущем устройстве
      await showSystemNotification(`SuuTech: ${t(`alerts.levels.${level}`)}`, {
        body: `${created.area ? `[${created.area}] ` : ''}${created.message}`,
        tag: created.id,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onNotify('error', t('admin.alerts.sendError', 'Не удалось отправить предупреждение'), msg)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Форма создания предупреждения */}
      <Card className="p-5 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">
              {t('admin.alerts.createTitle', 'Отправка оперативного предупреждения')}
            </h2>
            <p className="text-xs text-muted-foreground">
              {t(
                'admin.alerts.createLead',
                'Предупреждение мгновенно появится на главной странице жителей и в слое карты.',
              )}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Выбор уровня опасности */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink">
              {t('admin.alerts.levelLabel', 'Уровень опасности')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLevel('info')}
                className={cx(
                  'flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all',
                  level === 'info'
                    ? 'border-sky-500 bg-sky-50 text-sky-800 shadow-xs ring-2 ring-sky-400'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50',
                )}
              >
                <Info className="size-4 text-sky-600" />
                {t('alerts.levels.info', 'Информация')}
              </button>

              <button
                type="button"
                onClick={() => setLevel('warning')}
                className={cx(
                  'flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all',
                  level === 'warning'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-xs ring-2 ring-amber-400'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50',
                )}
              >
                <AlertTriangle className="size-4 text-amber-600" />
                {t('alerts.levels.warning', 'Внимание')}
              </button>

              <button
                type="button"
                onClick={() => setLevel('critical')}
                className={cx(
                  'flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all',
                  level === 'critical'
                    ? 'border-rose-500 bg-rose-50 text-rose-900 shadow-xs ring-2 ring-rose-400'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50',
                )}
              >
                <AlertOctagon className="size-4 text-rose-600" />
                {t('alerts.levels.critical', 'ЧС / Опасность')}
              </button>
            </div>
          </div>

          {/* Привязка к району / зоне */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink">
              {t('admin.alerts.areaLabel', 'Зона оповещения (населённый пункт / улица)')}
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              required
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-ink outline-hidden focus:border-brand"
            />
          </div>

          {/* Текст предупреждения */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink">
              {t('admin.alerts.messageLabel', 'Текст сообщения для жителей')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={3}
              placeholder={t(
                'admin.alerts.messagePlaceholder',
                'Например: Внимание! Ожидается резкий подъем уровня воды в арыках. Проверьте подвалы и очистите водостоки.',
              )}
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm text-ink outline-hidden focus:border-brand"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleSendTestPush}
              disabled={isTestingPush}
              className="gap-2 text-xs"
            >
              <BellRing className={cx('size-4 text-amber-500', isTestingPush && 'animate-spin')} />
              {t('admin.alerts.sendTestPushBtn', 'Отправить тестовое push-уведомление')}
            </Button>

            <Button
              type="submit"
              size="md"
              disabled={isSending || !message.trim()}
              className="gap-2"
            >
              {isSending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              {t('admin.alerts.sendBtn', 'Отправить предупреждение жителям')}
            </Button>
          </div>
        </form>
      </Card>

      {/* История ранее отправленных предупреждений */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">
            {t('admin.alerts.historyTitle', 'Ранее отправленные предупреждения')}
          </h3>
          <Button
            variant="outline"
            size="md"
            onClick={loadAlerts}
            disabled={isLoading}
            className="gap-1.5 text-xs h-8 min-h-8 px-2.5"
          >
            <RefreshCw className={cx('size-3', isLoading && 'animate-spin')} />
            {t('common.refresh', 'Обновить')}
          </Button>
        </div>

        {isLoading && alerts.length === 0 ? (
          <div className="flex justify-center p-8">
            <RefreshCw className="size-6 animate-spin text-brand" />
          </div>
        ) : alerts.length === 0 ? (
          <Card className="p-8 text-center text-xs text-muted-foreground">
            {t('admin.alerts.emptyHistory', 'Предупреждений пока не отправлялось')}
          </Card>
        ) : (
          <div className="space-y-2.5">
            {alerts.map((alert) => {
              const isCrit = alert.level === 'critical'
              const isWarn = alert.level === 'warning'
              const dateStr = new Date(alert.created_at).toLocaleString([], {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <Card
                  key={alert.id}
                  className={cx(
                    'p-4 transition-colors',
                    isCrit
                      ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/60'
                      : isWarn
                        ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/60'
                        : 'border-sky-200 bg-sky-50/50 dark:border-sky-900/60',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cx(
                          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold uppercase',
                          isCrit
                            ? 'bg-rose-600 text-white'
                            : isWarn
                              ? 'bg-amber-500 text-white'
                              : 'bg-sky-600 text-white',
                        )}
                      >
                        {isCrit ? (
                          <AlertOctagon className="size-3" />
                        ) : isWarn ? (
                          <AlertTriangle className="size-3" />
                        ) : (
                          <Info className="size-3" />
                        )}
                        {t(`alerts.levels.${alert.level}`)}
                      </span>

                      {alert.area && (
                        <span className="text-xs font-semibold text-ink">
                          {alert.area}
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {dateStr}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-snug text-ink font-medium">
                    {alert.message}
                  </p>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
