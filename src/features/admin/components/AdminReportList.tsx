import {
  AlertTriangle,
  Camera,
  Copy,
  Inbox,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CATEGORY_LABELS_RU,
  CATEGORY_META,
  URGENCY_LABELS_RU,
  URGENCY_META,
  type UrgencyLevel,
} from '../../../shared/lib/categories'
import { cx } from '../../../shared/lib/cx'
import type { ReportStatus, ReportWithTriage } from '../../../shared/types/database'

interface AdminReportListProps {
  reports: ReportWithTriage[]
  selectedReportId: string | null
  onSelectReport: (report: ReportWithTriage) => void
  onFilterByDuplicateGroup?: (group: string) => void
}

const STATUS_BADGE: Record<ReportStatus, { label: string; className: string }> = {
  new: { label: 'Новая', className: 'bg-muted text-muted-foreground border-border' },
  triaged: { label: 'На проверке', className: 'bg-amber-100 text-amber-900 border-amber-300' },
  assigned: { label: 'Назначена', className: 'bg-blue-100 text-blue-900 border-blue-300' },
  in_progress: { label: 'В работе', className: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
  resolved: { label: 'Решено', className: 'bg-emerald-100 text-emerald-900 border-emerald-300' },
  rejected: { label: 'Отклонено', className: 'bg-rose-100 text-rose-900 border-rose-300' },
}

export function AdminReportList({
  reports,
  selectedReportId,
  onSelectReport,
  onFilterByDuplicateGroup,
}: AdminReportListProps) {
  const { t } = useTranslation()

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Inbox className="size-10 text-muted-foreground/60" />
        <h3 className="mt-3 text-base font-bold text-ink">
          {t('admin.list.emptyTitle', 'Заявок не найдено')}
        </h3>
        <p className="mt-1 max-w-sm text-xs text-muted-foreground">
          {t('admin.list.emptyDesc', 'Нет обращений, соответствующих выбранным критериям фильтрации.')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {reports.map((report) => {
        const isSelected = report.id === selectedReportId
        const catMeta = report.category_user ? CATEGORY_META[report.category_user] : null
        const Icon = catMeta?.icon ?? Inbox
        const urgencyMeta = report.ai_triage?.urgency_ai
          ? URGENCY_META[report.ai_triage.urgency_ai as UrgencyLevel]
          : null
        const statusConfig = STATUS_BADGE[report.status] ?? STATUS_BADGE.new

        const dateStr = new Date(report.created_at).toLocaleString('ru-RU', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })

        const categoryTitle = report.category_user
          ? t(`categories.items.${report.category_user}.title`, { defaultValue: CATEGORY_LABELS_RU[report.category_user] })
          : t('admin.list.noCategory', 'Без категории')

        const urgencyLabel = report.ai_triage?.urgency_ai
          ? t(`categories.urgency.${report.ai_triage.urgency_ai}`, {
              defaultValue: URGENCY_LABELS_RU[report.ai_triage.urgency_ai as UrgencyLevel] || report.ai_triage.urgency_ai,
            })
          : null

        return (
          <div
            key={report.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectReport(report)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectReport(report)
              }
            }}
            className={cx(
              'group relative flex cursor-pointer flex-col gap-2 rounded-2xl border bg-card p-3.5 transition-all hover:border-brand-deep/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep',
              isSelected ? 'border-brand-deep ring-2 ring-brand-deep/20 shadow-sm' : 'border-border',
            )}
          >
            {/* Верхняя строка: Категория, Статус, Дата */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {catMeta ? (
                  <span
                    className={cx(
                      'flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-xs font-semibold',
                      catMeta.chip,
                    )}
                  >
                    <Icon className="size-3.5" />
                    {categoryTitle}
                  </span>
                ) : (
                  <span className="rounded-lg border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                    {categoryTitle}
                  </span>
                )}

                {/* Непосредственная опасность */}
                {report.immediate_danger && (
                  <span
                    className="flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[11px] font-bold text-rose-700 animate-pulse"
                    title={t('admin.list.dangerAlert', 'Непосредственная опасность жителю/дому!')}
                  >
                    <AlertTriangle className="size-3" />
                    112
                  </span>
                )}

                {/* Индикатор фото */}
                {report.photo_path && (
                  <span
                    className="flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                    title={t('admin.list.hasPhoto', 'Есть прикреплённое фото')}
                  >
                    <Camera className="size-3" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs">
                {/* Бейдж статуса */}
                <span
                  className={cx(
                    'rounded-lg border px-2 py-0.5 text-[11px] font-semibold',
                    statusConfig.className,
                  )}
                >
                  {statusConfig.label}
                </span>

                <span className="text-[11px] text-muted-foreground">{dateStr}</span>
              </div>
            </div>

            {/* Средняя строка: Комментарий жителя или AI резюме */}
            <div className="text-sm">
              {report.comment ? (
                <p className="line-clamp-2 text-ink font-normal leading-snug">
                  «{report.comment}»
                </p>
              ) : report.ai_triage?.summary ? (
                <p className="line-clamp-2 text-xs italic text-muted-foreground">
                  AI: {report.ai_triage.summary}
                </p>
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  {t('admin.list.noComment', 'Без комментария')}
                </p>
              )}
            </div>

            {/* Нижняя строка: AI-триаж метаданные (срочность, уверенность, дубликаты) */}
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Бейдж AI-срочности */}
                {urgencyMeta && urgencyLabel && (
                  <span
                    className={cx(
                      'rounded-md border px-1.5 py-0.5 text-[11px] font-bold',
                      urgencyMeta.badge,
                    )}
                  >
                    {urgencyLabel}
                  </span>
                )}

                {/* AI сомнения / Проверка человеком */}
                {report.ai_triage?.needs_human_review && (
                  <span
                    className="flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-800"
                    title={t('admin.list.needsReviewHint', 'AI рекомендует проверку человеком')}
                  >
                    <Sparkles className="size-2.5 text-purple-600" />
                    {t('admin.list.needsReview', 'Проверка')}
                  </span>
                )}

                {/* Группа дубликатов */}
                {report.ai_triage?.duplicate_group && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onFilterByDuplicateGroup?.(report.ai_triage!.duplicate_group!)
                    }}
                    className="flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 hover:bg-amber-100"
                    title={t('admin.list.filterGroupHint', 'Нажмите для фильтра по группе дубликатов')}
                  >
                    <Copy className="size-2.5" />
                    {report.ai_triage.duplicate_group}
                  </button>
                )}
              </div>

              <div className="text-[11px] text-muted-foreground">
                ID: <span className="font-mono">{report.id.slice(0, 8)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
