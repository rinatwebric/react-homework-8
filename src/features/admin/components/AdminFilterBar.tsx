import { AlertTriangle, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CATEGORY_LABELS_RU,
  REPORT_CATEGORIES,
  type ReportCategory,
} from '../../../shared/lib/categories'
import type { ReportStatus } from '../../../shared/types/database'

interface AdminFilterBarProps {
  status: ReportStatus | 'all'
  onStatusChange: (status: ReportStatus | 'all') => void
  category: ReportCategory | 'all'
  onCategoryChange: (category: ReportCategory | 'all') => void
  dangerOnly: boolean
  onDangerOnlyChange: (val: boolean) => void
  search: string
  onSearchChange: (search: string) => void
  totalCount: number
  filteredCount: number
}

export function AdminFilterBar({
  status,
  onStatusChange,
  category,
  onCategoryChange,
  dangerOnly,
  onDangerOnlyChange,
  search,
  onSearchChange,
  totalCount,
  filteredCount,
}: AdminFilterBarProps) {
  const { t } = useTranslation()

  const hasActiveFilters =
    status !== 'all' ||
    category !== 'all' ||
    dangerOnly ||
    Boolean(search)

  const handleResetFilters = () => {
    onStatusChange('all')
    onCategoryChange('all')
    onDangerOnlyChange(false)
    onSearchChange('')
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
            placeholder={t('admin.filters.searchPlaceholder', 'Поиск по комментарию или ID...')}
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
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
            <option value="new">{t('admin.status.new', 'Новая')}</option>
            <option value="triaged">{t('admin.status.triaged', 'На проверке')}</option>
            <option value="assigned">{t('admin.status.assigned', 'Назначена')}</option>
            <option value="in_progress">{t('admin.status.in_progress', 'В работе')}</option>
            <option value="resolved">{t('admin.status.resolved', 'Решено')}</option>
            <option value="rejected">{t('admin.status.rejected', 'Отклонено')}</option>
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
                {t(`categories.items.${c}.title`, CATEGORY_LABELS_RU[c])}
              </option>
            ))}
          </select>
        </div>

        {/* Чекбокс Только с опасностью (112) */}
        <div className="flex items-end">
          <label className="flex h-8 w-full cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-medium text-ink select-none hover:bg-muted/40">
            <input
              type="checkbox"
              checked={dangerOnly}
              onChange={(e) => onDangerOnlyChange(e.target.checked)}
              className="size-3.5 accent-rose-600"
            />
            <span className="flex items-center gap-1 truncate text-rose-700 font-semibold">
              <AlertTriangle className="size-3 shrink-0" />
              {t('admin.filters.dangerOnly', 'Только с угрозой (112)')}
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}
