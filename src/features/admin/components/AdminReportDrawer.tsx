import {
  AlertTriangle,
  Camera,
  Check,
  CloudRain,
  Copy,
  ExternalLink,
  History,
  MapPin,
  RefreshCw,
  Sparkles,
  Thermometer,
  UserCheck,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CATEGORY_LABELS_RU,
  CATEGORY_META,
  URGENCY_LABELS_RU,
  URGENCY_META,
  type UrgencyLevel,
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
  triggerAiTriage,
  updateReportStatus,
} from '../admin-api'

interface AdminReportDrawerProps {
  report: ReportWithTriage | null
  onClose: () => void
  onReportUpdated: (updated: ReportWithTriage) => void
  onFilterByDuplicateGroup?: (group: string) => void
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
  onFilterByDuplicateGroup,
}: AdminReportDrawerProps) {
  const { t, i18n } = useTranslation()

  const [currentStatus, setCurrentStatus] = useState<ReportStatus>('new')
  const [moderatorNote, setModeratorNote] = useState<string>('')
  const [isSavingStatus, setIsSavingStatus] = useState<boolean>(false)
  const [isRerunningTriage, setIsRerunningTriage] = useState<boolean>(false)
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
  const urgencyMeta = report.ai_triage?.urgency_ai
    ? URGENCY_META[report.ai_triage.urgency_ai as UrgencyLevel]
    : null
  const photoUrl = getReportPhotoUrl(report.photo_path)

  const weather = report.weather_snapshot as {
    temp_c?: number
    precip_mm?: number
    humidity?: number
  } | null

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

      // Обновляем историю
      const updatedHistory = await fetchReportHistory(report.id)
      setHistory(updatedHistory)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Ошибка при сохранении')
    } finally {
      setIsSavingStatus(false)
    }
  }

  // Обработчик перезапуска AI-триажа
  const handleRerunTriage = async () => {
    setIsRerunningTriage(true)
    setErrorMessage(null)

    try {
      const lang = i18n.language === 'ky' ? 'ky' : 'ru'
      const triage = await triggerAiTriage(report.id, lang)

      const updatedReport: ReportWithTriage = {
        ...report,
        ai_triage: {
          report_id: report.id,
          category_ai: triage.category,
          urgency_ai: triage.urgency,
          summary: triage.summary,
          recommended_action: triage.recommended_action,
          duplicate_group: triage.duplicate_group,
          confidence: triage.confidence,
          needs_human_review: triage.needs_human_review,
          model: 'gemini-1.5-flash',
          created_at: new Date().toISOString(),
        },
      }
      onReportUpdated(updatedReport)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Ошибка перезапуска триажа')
    } finally {
      setIsRerunningTriage(false)
    }
  }

  const categoryTitle = report.category_user
    ? t(`categories.items.${report.category_user}.title`, { defaultValue: CATEGORY_LABELS_RU[report.category_user] })
    : t('admin.list.noCategory', 'Категория не указана')

  const triageCategoryTitle = report.ai_triage?.category_ai
    ? t(`categories.items.${report.ai_triage.category_ai}.title`, { defaultValue: CATEGORY_LABELS_RU[report.ai_triage.category_ai] })
    : '—'

  const triageUrgencyTitle = report.ai_triage?.urgency_ai
    ? t(`categories.urgency.${report.ai_triage.urgency_ai}`, { defaultValue: URGENCY_LABELS_RU[report.ai_triage.urgency_ai as UrgencyLevel] })
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs transition-opacity">
      <div className="relative flex h-full w-full max-w-xl flex-col bg-background shadow-2xl overflow-y-auto">
        {/* Заголовок карточки */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-muted-foreground">
              #{report.id.slice(0, 8)}
            </span>
            {report.is_demo && <DemoTag />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-ink"
            aria-label={t('common.close', 'Закрыть')}
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 p-5">
          {errorMessage && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-900">
              {errorMessage}
            </div>
          )}

          {/* Предупреждение 112 при непосредственной опасности */}
          {report.immediate_danger && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-950">
              <AlertTriangle className="size-5 shrink-0 text-rose-600" />
              <div>
                <p className="text-sm font-bold">
                  {t('admin.drawer.immediateDangerTitle', 'Непосредственная опасность жителю / дому!')}
                </p>
                <p className="mt-1 text-xs text-rose-900 leading-relaxed">
                  {t(
                    'admin.drawer.immediateDangerDesc',
                    'Заявитель отметил угрозу жизни или строению. Рекомендуется немедленная координация с дежурной частью 112.',
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Раздел 1: Данные жителя */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('admin.drawer.residentData', 'Сообщение жителя')}
            </h3>

            {/* Категория жителя */}
            <div className="flex items-center gap-2">
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
            <div className="rounded-2xl border border-border bg-card p-4">
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
                    {weather.temp_c != null ? `${weather.temp_c}°C` : 'н/д'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CloudRain className="size-4 text-blue-600" />
                  <span>
                    {weather.precip_mm != null ? `${weather.precip_mm} мм` : '0 мм'}
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
                    className="flex items-center gap-1 text-[11px] font-medium text-brand-deep hover:underline"
                  >
                    OSM <ExternalLink className="size-3" />
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
                  className="max-h-64 w-full object-cover bg-black/5"
                  loading="lazy"
                />
              </div>
            ) : null}
          </div>

          <hr className="border-border" />

          {/* Раздел 2: Блок AI-триажа */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-purple-900">
                <Sparkles className="size-3.5 text-purple-600" />
                {t('admin.drawer.triageTitle', 'AI-триаж диспетчера')}
              </h3>

              <Button
                variant="outline"
                size="md"
                onClick={handleRerunTriage}
                disabled={isRerunningTriage}
                className="text-xs h-8 min-h-8 gap-1 px-2.5"
              >
                <RefreshCw className={cx('size-3', isRerunningTriage && 'animate-spin')} />
                {isRerunningTriage
                  ? t('admin.drawer.runningTriage', 'Анализ...')
                  : t('admin.drawer.rerunTriage', 'Запустить заново')}
              </Button>
            </div>

            {report.ai_triage ? (
              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 space-y-3 text-xs">
                {/* Бейджи категории и срочности */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-purple-950">
                    {t('admin.drawer.proposedCategory', 'Категория:')}
                  </span>
                  <span className="rounded-md border border-purple-300 bg-purple-100 px-2 py-0.5 font-bold text-purple-900">
                    {triageCategoryTitle}
                  </span>

                  <span className="font-semibold text-purple-950 ml-2">
                    {t('admin.drawer.proposedUrgency', 'Срочность:')}
                  </span>
                  {urgencyMeta && (
                    <span className={cx('rounded-md border px-2 py-0.5 font-bold', urgencyMeta.badge)}>
                      {triageUrgencyTitle}
                    </span>
                  )}

                  {report.ai_triage.confidence != null && (
                    <span className="ml-auto text-purple-700 font-medium">
                      Уверенность: {Math.round(report.ai_triage.confidence * 100)}%
                    </span>
                  )}
                </div>

                {/* AI Резюме */}
                <div>
                  <p className="font-semibold text-purple-950 mb-0.5">
                    {t('admin.drawer.summaryLabel', 'Резюме диспетчера:')}
                  </p>
                  <p className="text-purple-900 leading-relaxed bg-white/70 rounded-xl p-2.5 border border-purple-100">
                    {report.ai_triage.summary || '—'}
                  </p>
                </div>

                {/* Рекомендуемое действие */}
                <div>
                  <p className="font-semibold text-purple-950 mb-0.5">
                    {t('admin.drawer.actionLabel', 'Рекомендуемое действие:')}
                  </p>
                  <p className="text-purple-900 font-medium leading-relaxed bg-white/70 rounded-xl p-2.5 border border-purple-100">
                    {report.ai_triage.recommended_action || '—'}
                  </p>
                </div>

                {/* Группа дубликатов */}
                {report.ai_triage.duplicate_group && (
                  <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 p-2.5">
                    <span className="flex items-center gap-1.5 font-medium text-amber-950">
                      <Copy className="size-3.5 text-amber-700" />
                      Группа дубликатов: <strong>{report.ai_triage.duplicate_group}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onFilterByDuplicateGroup?.(report.ai_triage!.duplicate_group!)}
                      className="rounded-lg bg-amber-200/80 px-2 py-1 text-[11px] font-bold text-amber-950 hover:bg-amber-300"
                    >
                      {t('admin.drawer.filterSimilar', 'Показать похожие')}
                    </button>
                  </div>
                )}

                {/* Плашка необходимости проверки человеком */}
                {report.ai_triage.needs_human_review && (
                  <div className="flex items-center gap-2 text-[11px] text-purple-800 bg-purple-100/70 rounded-lg px-2.5 py-1.5">
                    <UserCheck className="size-3.5 text-purple-700" />
                    <span>{t('admin.drawer.needsReviewNotice', 'Флаг: рекомендуется контрольная проверка оператором.')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                <p>{t('admin.drawer.noTriage', 'AI-триаж ещё не выполнялся для этой заявки.')}</p>
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleRerunTriage}
                  disabled={isRerunningTriage}
                  className="mt-2 text-xs h-8 min-h-8"
                >
                  {isRerunningTriage ? 'Запуск...' : 'Запустить AI-триаж'}
                </Button>
              </div>
            )}
          </div>

          <hr className="border-border" />

          {/* Раздел 3: Управление статусом модератором */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t('admin.drawer.moderatorControl', 'Решение модератора')}
            </h3>

            {/* Выбор статуса */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                {t('admin.drawer.selectStatus', 'Текущий статус заявки:')}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCurrentStatus(opt.id)}
                    className={cx(
                      'rounded-xl border p-2 text-xs font-semibold transition-all text-center',
                      currentStatus === opt.id
                        ? 'border-brand-deep bg-brand-deep text-white shadow-xs'
                        : 'border-border bg-card text-ink hover:bg-muted/50',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Заметка модератора */}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">
                {t('admin.drawer.moderatorNote', 'Заметка модератора (будет записана в историю):')}
              </label>
              <textarea
                value={moderatorNote}
                onChange={(e) => setModeratorNote(e.target.value)}
                placeholder={t('admin.drawer.notePlaceholder', 'Причина смены статуса, назначенная бригада, комментарий...')}
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
                className="w-full"
              >
                {isSavingStatus ? t('common.saving', 'Сохранение...') : t('admin.drawer.saveStatus', 'Сохранить статус и заметку')}
              </Button>
              {saveSuccess && (
                <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <Check className="size-4" />
                  {t('common.saved', 'Сохранено')}
                </span>
              )}
            </div>

            {/* История переходов статусов */}
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                <History className="size-3.5" />
                {t('admin.drawer.historyTitle', 'История изменений')}
              </h4>

              {isLoadingHistory ? (
                <p className="text-xs text-muted-foreground">{t('common.loading', 'Загрузка истории...')}</p>
              ) : history.length > 0 ? (
                <ol className="relative border-l border-border/70 ml-2 space-y-3 text-xs">
                  {history.map((h) => (
                    <li key={h.id} className="ml-4">
                      <div className="absolute -left-1.5 mt-1 size-3 rounded-full border border-background bg-brand-deep" />
                      <div className="font-semibold text-ink">
                        {h.from_status ? `${h.from_status} → ` : ''}
                        <span className="text-brand-deep">{h.to_status}</span>
                      </div>
                      <time className="text-[10px] text-muted-foreground">
                        {new Date(h.created_at).toLocaleString('ru-RU')}
                      </time>
                      {h.note && (
                        <p className="mt-0.5 text-ink/80 bg-muted/40 rounded-lg p-2 text-[11px]">
                          {h.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  {t('admin.drawer.noHistory', 'История изменений пока пуста')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
