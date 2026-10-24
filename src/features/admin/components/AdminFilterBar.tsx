import { Filter, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  REPORT_CATEGORIES,
  URGENCY_LEVELS,
  type ReportCategory,
  type UrgencyLevel,
} from '../../../shared/lib/categories'
import type { ReportStatus } from '../../../shared/types/database'

interface AdminFilterBarProps {
  status: ReportStatus | 'all'
  onStatusChange: (status: ReportStatus | 'all') => void
  urgency: UrgencyLevel | 'all'
  onUrgencyChange: (urgency: UrgencyLevel | 'all') => void
  category: ReportCategory | 'all'
  onCategoryChange: (category: ReportCategory | 'all') => void
  needsReviewOnly: boolean
  onNeedsReviewChange: (val: boolean) => void
  search: string
  onSearchChange: (search: string) => void
  duplicateGroup: string | null
  onClearDuplicateGroup: () => void
  totalCount: number
  filteredCount: number
}

export function AdminFilterBar({
  status,
  onStatusChange,
  urgency,
  onUrgencyChange,
  category,
  onCategoryChange,
  needsReviewOnly,
  onNeedsReviewChange,
  search,
  onSearchChange,
  duplicateGroup,
  onClearDuplicateGroup,
  totalCount,
  filteredCount,
}: AdminFilterBarProps) {
  const { t } = useTranslation()

  const hasActiveFilters =
    status !== 'all' ||
    urgency !== 'all' ||
    category !== 'all' ||
    needsReviewOnly ||
    Boolean(search) ||
    Boolean(duplicateGroup)

  const handleResetFilters = () => {
    onStatusChange('all')
    onUrgencyChange('all')
    onCategoryChange('all')
    onNeedsReviewChange(false)
    onSearchChange('')
    onClearDuplicateGroup()
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Поиск */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('admin.filters.searchPlaceholder', 'Поиск по комментарию, резюме или ID...')}
            className="w-full rounded-xl border border-border bg-background py-2 pr-4 pl-9 text-sm text-ink placeholder:text-muted-foreground focus:border-brand-deep focus:outline-none focus:ring-1 focus:ring-brand-deep"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Счётчик и сброс */}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground md:justify-end">
          <span>
            {t('admin.filters.shown', 'Показано:')} <strong className="text-ink">{filteredCount}</strong> {t('admin.filters.from', 'из')} {totalCount}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 font-semibold text-brand-deep hover:underline"
            >
              <X className="size-3.5" />
              {t('admin.filters.reset', 'Сбросить')}
            </button>
          )}
        </div>
      </div>

      {/* Селекторы */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {/* Фильтр по статусу */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">
            {t('admin.filters.status', 'Статус')}
          </label>
          <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value as ReportStatus | 'all')}
            className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink focus:border-brand-deep focus:outline-none"
          >
            <option value="all">{t('admin.filters.allStatuses', 'Все статусы')}</option>
            <option value="new">{t('admin.status.new', 'Новая (new)')}</option>
            <option value="triaged">{t('admin.status.triaged', 'На проверке (triaged)')}</option>
            <option value="assigned">{t('admin.status.assigned', 'Назначена (assigned)')}</option>
            <option value="in_progress">{t('admin.status.in_progress', 'В работе (in_progress)')}</option>
            <option value="resolved">{t('admin.status.resolved', 'Решено (resolved)')}</option>
            <option value="rejected">{t('admin.status.rejected', 'Отклонено (rejected)')}</option>
          </select>
        </div>

        {/* Фильтр по срочности */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">
            {t('admin.filters.urgency', 'Срочность (AI)')}
          </label>
          <select
            value={urgency}
            onChange={(e) => onUrgencyChange(e.target.value as UrgencyLevel | 'all')}
            className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink focus:border-brand-deep focus:outline-none"
          >
            <option value="all">{t('admin.filters.allUrgencies', 'Все приоритеты')}</option>
            {URGENCY_LEVELS.map((u) => (
              <option key={u} value={u}>
                {t(`categories.urgency.${u}`, u)}
              </option>
            ))}
          </select>
        </div>

        {/* Фильтр по категории */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-muted-foreground">
            {t('admin.filters.category', 'Категория')}
          </label>
          <select
            value={category}
            onChange={(e) => onCategoryChange(e.target.value as ReportCategory | 'all')}
            className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink focus:border-brand-deep focus:outline-none"
          >
            <option value="all">{t('admin.filters.allCategories', 'Все категории')}</option>
            {REPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`categories.items.${c}.title`, c)}
              </option>
            ))}
          </select>
        </div>

        {/* Чекбокс Проверка человеком */}
        <div className="flex items-end">
          <label className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-medium text-ink select-none hover:bg-muted/40">
            <input
              type="checkbox"
              checked={needsReviewOnly}
              onChange={(e) => onNeedsReviewChange(e.target.checked)}
              className="size-3.5 accent-purple-600"
            />
            <span className="truncate">{t('admin.filters.needsReviewOnly', 'Требует проверки')}</span>
          </label>
        </div>
      </div>

      {/* Плашка активной группы дубликатов */}
      {duplicateGroup && (
        <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          <span className="flex items-center gap-1.5 font-medium">
            <Filter className="size-3.5" />
            {t('admin.filters.activeGroup', 'Фильтр по группе дубликатов:')} <strong>{duplicateGroup}</strong>
          </span>
          <button
            type="button"
            onClick={onClearDuplicateGroup}
            className="rounded p-0.5 hover:bg-amber-100"
            title={t('admin.filters.clearGroup', 'Очистить фильтр группы')}
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
