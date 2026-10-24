import { AlertCircle, CheckCircle2, Clock, Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../../shared/lib/cx'
import type { ReportStatus } from '../../../shared/types/database'
import type { AdminKpiStats } from '../admin-utils'

interface AdminKpiCardsProps {
  stats: AdminKpiStats
  activeStatus: ReportStatus | 'all'
  onSelectStatus: (status: ReportStatus | 'all') => void
}

export function AdminKpiCards({
  stats,
  activeStatus,
  onSelectStatus,
}: AdminKpiCardsProps) {
  const { t } = useTranslation()

  const items = [
    {
      id: 'new' as const,
      label: t('admin.kpi.new', 'Новые'),
      count: stats.newCount,
      icon: Inbox,
      tone: 'border-brand-deep/30 bg-brand-soft/40 text-brand-deep',
      activeTone: 'ring-2 ring-brand-deep bg-brand-soft/80',
    },
    {
      id: 'triaged' as const,
      label: t('admin.kpi.triaged', 'На проверке'),
      count: stats.triagedCount,
      icon: Clock,
      tone: 'border-amber-300 bg-amber-50 text-amber-900',
      activeTone: 'ring-2 ring-amber-500 bg-amber-100',
    },
    {
      id: 'in_progress' as const,
      label: t('admin.kpi.inProgress', 'В работе'),
      count: stats.inProgressCount,
      icon: AlertCircle,
      tone: 'border-blue-300 bg-blue-50 text-blue-900',
      activeTone: 'ring-2 ring-blue-500 bg-blue-100',
    },
    {
      id: 'resolved' as const,
      label: t('admin.kpi.resolved', 'Решено'),
      count: stats.resolvedCount,
      icon: CheckCircle2,
      tone: 'border-emerald-300 bg-emerald-50 text-emerald-900',
      activeTone: 'ring-2 ring-emerald-500 bg-emerald-100',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = activeStatus === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectStatus(isActive ? 'all' : item.id)}
            className={cx(
              'group flex flex-col justify-between rounded-2xl border p-4 text-left transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-deep',
              item.tone,
              isActive && item.activeTone,
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {item.label}
              </span>
              <Icon className="size-4 opacity-70 transition-transform group-hover:scale-110" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-extrabold tracking-tight">{item.count}</span>
              {isActive && (
                <span className="text-[11px] font-medium opacity-75">
                  {t('admin.kpi.filtered', 'активен')}
                </span>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
