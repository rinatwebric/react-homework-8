import {
  AlertTriangle,
  Camera,
  Check,
  CloudRain,
  ExternalLink,
  History,
  MapPin,
  Thermometer,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CATEGORY_LABELS_RU,
  CATEGORY_META,
} from '../../../shared/lib/categories'
import { cx } from '../../../shared/lib/cx'
import { getReportPhotoUrl } from '../../../shared/lib/storage'
import { Button } from '../../../shared/ui/Button'
import { DemoTag } from '../../../shared/ui/DemoTag'
import type {
  ReportStatus,
  ReportStatusHistoryRow,
  ReportWithTriage,
} from '../../../shared/types/database'
import {
  fetchReportHistory,
  updateReportStatus,
} from '../admin-api'

interface AdminReportDrawerProps {
  report: ReportWithTriage | null
  onClose: () => void
  onReportUpdated: (updated: ReportWithTriage) => void
  onNotify?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void
}

const STATUS_OPTIONS: { id: ReportStatus; label: string }[] = [
  { id: 'new', label: 'Новая' },
  { id: 'triaged', label: 'На проверке' },
  { id: 'assigned', label: 'Назначена службе' },
  { id: 'in_progress', label: 'В работе' },
  { id: 'resolved', label: 'Решено' },
  { id: 'rejected', label: 'Отклонено' },
]

export function AdminReportDrawer({
  report,
  onClose,
  onReportUpdated,
  onNotify,
}: AdminReportDrawerProps) {
  const { t } = useTranslation()

  const [currentStatus, setCurrentStatus] = useState<ReportStatus>('new')
  const [moderatorNote, setModeratorNote] = useState<string>('')
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false)
  const [history, setHistory] = useState<ReportStatusHistoryRow[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false)
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (report) {
      setCurrentStatus(report.status)
      setModeratorNote(report.moderator_note ?? '')
      setSaveSuccess(false)
      setErrorMessage(null)

      // Загружаем историю переходов статуса
      setIsLoadingHistory(true)
      fetchReportHistory(report.id)
        .then((items) => setHistory(items))
        .catch(() => setHistory([]))
        .finally(() => setIsLoadingHistory(false))
    }
  }, [report])

  if (!report) return null

  const catMeta = report.category_user ? CATEGORY_META[report.category_user] : null
  const CatIcon = catMeta?.icon ?? MapPin
  const photoUrl = getReportPhotoUrl(report.photo_path)

  const weather = report.weather_snapshot as {
    temp_c?: number
    temperature_c?: number
    precip_mm?: number
    precipitation_mm?: number
    humidity?: number
    humidity_pct?: number
  } | null

  const tempVal = weather?.temperature_c ?? weather?.temp_c
  const precipVal = weather?.precipitation_mm ?? weather?.precip_mm

  const isCriticalRisk =
    report.immediate_danger || (report.comment ?? '').includes('[Критический')
  const isHighRisk = (report.comment ?? '').includes('[Высокий')
  const isModerateRisk = (report.comment ?? '').includes('[Умеренный')

  // Обработчик сохранения статуса
  const handleSaveStatus = async () => {
    setIsSavingStatus(true)
    setErrorMessage(null)
    setSaveSuccess(false)

    try {
      await updateReportStatus(report.id, currentStatus, moderatorNote || null)
      setSaveSuccess(true)

      const updatedReport: ReportWithTriage = {
        ...report,
        status: currentStatus,
        moderator_note: moderatorNote || null,
      }
      onReportUpdated(updatedReport)

      const statusName = STATUS_OPTIONS.find((s) => s.id === currentStatus)?.label || currentStatus
      onNotify?.('success', 'Статус сохранён', `Заявка переведена в статус: ${statusName}`)

      // Обновляем историю
      const updatedHistory = await fetchReportHistory(report.id)
      setHistory(updatedHistory)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка при сохранении'
      setErrorMessage(msg)
      onNotify?.('error', 'Не удалось обновить статус', msg)
    } finally {
      setIsSavingStatus(false)
    }
  }

  const categoryTitle = report.category_user
    ? t(`categories.items.${report.category_user}.title`, {
        defaultValue: CATEGORY_LABELS_RU[report.category_user],
      })
    : t('admin.drawer.noCategory', 'Не указана')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 flex justify-end bg-ink/40 backdrop-blur-xs transition-opacity"
    >
      <div
        className="relative flex h-full w-full max-w-xl flex-col bg-card shadow-2xl overflow-y-auto"
        tabIndex={-1}
      >
        {/* Шапка модалки */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <h2 id="drawer-title" className="text-base font-bold text-ink">
              {t('admin.drawer.title', 'Карточка заявки')}
            </h2>
            <span className="font-mono text-xs text-muted-foreground">
              #{report.id.slice(0, 8)}
            </span>
            {report.is_demo && <DemoTag />}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-ink transition-colors"
            title={t('common.close', 'Закрыть')}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Тело карточки */}
        <div className="flex-1 space-y-6 p-5">
          {/* Сообщение об ошибке или успехе */}
          {errorMessage && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3.5 text-xs text-rose-950 flex items-start gap-2 shadow-xs">
              <AlertTriangle className="size-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">{t('admin.drawer.errorTitle', 'Ошибка:')}</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {saveSuccess && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-950 flex items-center gap-2 shadow-xs">
              <Check className="size-4 text-emerald-600 shrink-0" />
              <span>{t('admin.drawer.saveSuccess', 'Статус заявки успешно обновлен.')}</span>
            </div>
          )}

          {/* Раздел 1: Данные жителя */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('admin.drawer.citizenData', 'Данные жителя')}
              </h3>
              {isCriticalRisk ? (
                <span className="flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 animate-pulse">
                  <AlertTriangle className="size-3.5" />
                  Критический риск (112)
                </span>
              ) : isHighRisk ? (
                <span className="flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
                  <AlertTriangle className="size-3.5" />
                  Высокий риск
                </span>
              ) : isModerateRisk ? (
                <span className="flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800">
                  Умеренный риск
                </span>
              ) : null}
            </div>

            {/* Категория жителя */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {catMeta ? (
                <div
                  className={cx(
                    'flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-bold',
                    catMeta.chip,
                  )}
                >
                  <CatIcon className="size-4" />
                  {categoryTitle}
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
                  {categoryTitle}
                </div>
              )}

              <span className="text-xs text-muted-foreground">
                {new Date(report.created_at).toLocaleString('ru-RU')}
              </span>
            </div>

            {/* Комментарий жителя */}
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                {t('admin.drawer.commentLabel', 'Текст комментария:')}
              </p>
              {report.comment ? (
                <p className="text-sm text-ink leading-relaxed">
                  «{report.comment}»
                </p>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  {t('admin.drawer.noComment', 'Житель не оставил текстового описания')}
                </p>
              )}
            </div>

            {/* Снимок погоды weather_snapshot */}
            {weather && (
              <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/40 p-3 text-xs text-ink">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="size-4 text-brand-deep" />
                  <span>
                    {tempVal != null ? `${tempVal}°C` : 'н/д'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CloudRain className="size-4 text-blue-600" />
                  <span>
                    {precipVal != null ? `${precipVal} мм` : '0 мм'}
                  </span>
                </div>
                {weather.humidity != null && (
                  <span className="text-muted-foreground">
                    Влажность: {weather.humidity}%
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Open-Meteo
                </span>
              </div>
            )}

            {/* Точные координаты */}
            <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink flex items-center gap-1">
                  <MapPin className="size-3.5 text-brand-deep" />
                  {t('admin.drawer.coordinates', 'Точные координаты (модератор):')}
                </span>
                {report.lat != null && report.lng != null && (
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${report.lat}&mlon=${report.lng}#map=17/${report.lat}/${report.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[11px] font-semibold text-brand-deep hover:underline"
                  >
                    Открыть на карте <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <div className="font-mono text-muted-foreground text-[11px]">
                {report.lat?.toFixed(5) ?? '—'}, {report.lng?.toFixed(5) ?? '—'}
                {report.accuracy_m != null && ` (точность ±${Math.round(report.accuracy_m)}м)`}
                {report.location_adjusted_m != null &&
                  ` · сдвиг: ${Math.round(report.location_adjusted_m)}м`}
              </div>
            </div>

            {/* Фотография */}
            {photoUrl ? (
              <div className="rounded-2xl border border-border overflow-hidden">
                <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  <Camera className="size-3.5" />
                  {t('admin.drawer.photoTitle', 'Прикреплённая фотография')}
                </div>
                <img
                  src={photoUrl}
                  alt={report.comment ?? 'Фото заявки'}
                  className="max-h-72 w-full object-cover bg-black/5"
                  loading="lazy"
                />
              </div>
            ) : null}
          </div>

          <hr className="border-border" />

          {/* Раздел 2: Управление статусом модератором */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('admin.drawer.moderatorControl', 'Решение модератора')}
            </h3>

            {/* Выбор статуса: исправленные контрастные кнопки */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                {t('admin.drawer.selectStatus', 'Текущий статус заявки:')}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = currentStatus === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCurrentStatus(opt.id)}
                      className={cx(
                        'rounded-xl border p-2.5 text-xs transition-all text-center select-none shadow-xs',
                        isSelected
                          ? 'border-ink bg-ink text-white font-bold ring-2 ring-ink/30 scale-[1.02]'
                          : 'border-border bg-card text-ink font-medium hover:bg-brand-soft/70 hover:border-brand/40',
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Заметка модератора */}
            <div>
              <label className="block text-xs font-bold text-ink mb-1.5">
                {t('admin.drawer.moderatorNote', 'Заметка модератора (будет записана в историю):')}
              </label>
              <textarea
                value={moderatorNote}
                onChange={(e) => setModeratorNote(e.target.value)}
                placeholder={t(
                  'admin.drawer.notePlaceholder',
                  'Причина смены статуса, назначенная бригада, комментарий...',
                )}
                rows={3}
                className="w-full rounded-xl border border-border bg-background p-3 text-xs text-ink placeholder:text-muted-foreground focus:border-brand-deep focus:outline-none focus:ring-1 focus:ring-brand-deep"
              />
            </div>

            {/* Кнопка сохранения */}
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleSaveStatus}
                disabled={isSavingStatus}
                className="w-full font-bold py-2.5"
              >
                {isSavingStatus ? (
                  t('common.saving', 'Сохранение...')
                ) : (
                  <>
                    <Check className="size-4 mr-1.5" />
                    {t('admin.drawer.saveStatusBtn', 'Сохранить решение')}
                  </>
                )}
              </Button>
            </div>
          </div>

          <hr className="border-border" />

          {/* Раздел 3: История статусов */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <History className="size-3.5 text-muted-foreground" />
              {t('admin.drawer.historyTitle', 'История изменений')}
            </h3>

            {isLoadingHistory ? (
              <p className="text-xs text-muted-foreground">
                {t('common.loading', 'Загрузка...')}
              </p>
            ) : history.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                {t('admin.drawer.noHistory', 'История переходов статуса отсутствует.')}
              </p>
            ) : (
              <ol className="relative border-l border-border ml-2 space-y-4 text-xs">
                {history.map((h) => {
                  const toLabel =
                    STATUS_OPTIONS.find((s) => s.id === h.to_status)?.label || h.to_status
                  const fromLabel =
                    STATUS_OPTIONS.find((s) => s.id === h.from_status)?.label || h.from_status
                  return (
                    <li key={h.id} className="ml-4 space-y-1">
                      <div className="absolute -left-1.5 mt-1 size-3 rounded-full border border-background bg-ink" />
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-ink">
                          {fromLabel ? `${fromLabel} → ` : ''}
                          <span className="text-brand-deep font-extrabold">{toLabel}</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(h.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {h.note && (
                        <p className="text-muted-foreground italic rounded-lg bg-muted/30 p-2">
                          «{h.note}»
                        </p>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
