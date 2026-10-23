import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../../shared/lib/cx'
import {
  PERIOD_FILTERS,
  RISK_FILTERS,
  STATUS_FILTERS,
  hasActiveFilters,
  type MapFilters,
} from '../lib/map-filters'

type ChipProps = {
  active: boolean
  onClick: () => void
  children: ReactNode
}

/** Чип фильтра: ≥44 px по высоте, состояние — и цветом, и aria-pressed. */
function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'min-h-10 shrink-0 rounded-full border px-3 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        active
          ? 'border-ink bg-ink text-on-ink'
          : 'border-border bg-card text-foreground hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}

type MapFiltersBarProps = {
  filters: MapFilters
  onChange: (next: MapFilters) => void
}

/**
 * Фильтры карты: риск отчёта, период, статус. Горизонтальная прокрутка — на телефоне
 * чипы не должны ломаться в три строки и отжимать карту.
 */
export function MapFiltersBar({ filters, onChange }: MapFiltersBarProps) {
  const { t } = useTranslation()

  return (
    <section aria-label={t('map.filtersLabel')} className="space-y-2">
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {RISK_FILTERS.map((value) => (
          <Chip
            key={value}
            active={filters.risk === value}
            onClick={() => onChange({ ...filters, risk: value })}
          >
            {t(`map.risk.${value}`)}
          </Chip>
        ))}
      </div>

      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {PERIOD_FILTERS.map((value) => (
          <Chip
            key={value}
            active={filters.period === value}
            onClick={() => onChange({ ...filters, period: value })}
          >
            {t(`map.period.${value}`)}
          </Chip>
        ))}
        {STATUS_FILTERS.filter((value) => value !== 'all').map((value) => (
          <Chip
            key={value}
            active={filters.status === value}
            onClick={() =>
              onChange({ ...filters, status: filters.status === value ? 'all' : value })
            }
          >
            {t(`map.status.${value}`)}
          </Chip>
        ))}
      </div>

      {hasActiveFilters(filters) ? (
        <button
          type="button"
          onClick={() => onChange({ ...filters, risk: 'all', period: 'all', status: 'all' })}
          className="text-sm font-semibold text-brand underline-offset-2 hover:underline"
        >
          {t('map.reset')}
        </button>
      ) : null}
    </section>
  )
}