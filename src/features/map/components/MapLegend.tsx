import { useTranslation } from 'react-i18next'
import { NO_DATA_FILL_HEX } from '../../../config/map'
import { RISK_LEVELS } from '../../../config/risk'
import { cx } from '../../../shared/lib/cx'

/** Цвета — литеральные классы Tailwind (динамическая сборка имён не работает). */
const FILL_CLASS = {
  normal: 'bg-risk-normal-fill',
  elevated: 'bg-risk-elevated-fill',
  high: 'bg-risk-high-fill',
  critical: 'bg-risk-critical-fill',
} as const

/**
 * Шкала карты. Риск — цветом + текстом (AGENTS.md), серая плашка = «данных нет»,
 * а не «норма»: без этой строки серые зоны читались бы как благополучные.
 */
export function MapLegend({ className }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <div className={cx('rounded-card border border-border bg-card/95 p-3 shadow-sm', className)}>
      <p className="text-xs font-semibold text-foreground">{t('map.legendTitle')}</p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
        {RISK_LEVELS.map((level) => (
          <li key={level} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden className={cx('size-3 shrink-0 rounded-full', FILL_CLASS[level])} />
            {t(`risk.${level}`)}
          </li>
        ))}
        <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className="size-3 shrink-0 rounded-full border border-dashed border-muted-foreground"
            style={{ backgroundColor: NO_DATA_FILL_HEX }}
          />
          {t('map.legendNoData')}
        </li>
      </ul>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{t('map.legendHint')}</p>
    </div>
  )
}