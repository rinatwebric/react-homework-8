import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RiskLevel } from '../../../config/risk'
import { RiskBadge } from '../../../shared/ui/RiskBadge'

type ZoneInfoCardProps = {
  zoneName: string
  level: RiskLevel | null
  /** Отчётов в этой зоне с учётом фильтров — показывает, откуда вообще взялся риск. */
  reports: number
  onClose: () => void
}

/**
 * Карточка выбранной зоны. Нет уровня — пишем «нет данных» и не рисуем зелёное:
 * отсутствие сигналов не равно благополучию (AGENTS.md).
 */
export function ZoneInfoCard({ zoneName, level, reports, onClose }: ZoneInfoCardProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-card border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{zoneName}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('map.zoneClose')}
          className="-m-1 grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <div className="mt-2">
        {level ? (
          <RiskBadge level={level} />
        ) : (
          <span className="inline-flex items-center rounded-full border border-dashed border-muted-foreground px-3 py-1 text-sm font-semibold text-muted-foreground">
            {t('map.legendNoData')}
          </span>
        )}
      </div>

      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
        {t('map.zoneReports', { count: reports })}
      </p>
      {level ? null : (
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{t('map.zoneNoDataHint')}</p>
      )}
      <p className="mt-1 text-xs leading-snug text-muted-foreground">{t('map.zoneModelHint')}</p>
    </div>
  )
}