import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEMO_MAP } from '../../config/demo'
import { cx } from '../../shared/lib/cx'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { DemoTag } from '../../shared/ui/DemoTag'
import { RiskBadge } from '../../shared/ui/RiskBadge'
import { MapPreview } from './MapPreview'

const FILTERS = [
  { id: 'flood', labelKey: 'map.filters.flood' },
  { id: 'roads', labelKey: 'map.filters.roads' },
  { id: 'drain', labelKey: 'map.filters.drain' },
] as const

type MapFilter = (typeof FILTERS)[number]['id']

const LEGEND_DOT: Record<(typeof DEMO_MAP.legend)[number], string> = {
  normal: 'bg-risk-normal-fill',
  elevated: 'bg-risk-elevated-fill',
  high: 'bg-risk-high-fill',
}

/** Срез 2: карта страны, зоны районов, метки отчётов. Грузится отдельным чанком. */
export default function MapPage() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<MapFilter>('flood')

  return (
    <section className="relative -mx-4 -mt-6 -mb-28 flex min-h-[calc(100dvh-1.5rem)] flex-col overflow-hidden bg-[#dcebf7]">
      <h1 className="sr-only">{t('map.title')}</h1>
      <MapPreview />

      <div className="relative z-10 flex flex-wrap gap-2 p-4">
        {FILTERS.map(({ id, labelKey }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={cx(
              'min-h-12 rounded-full px-4 text-sm font-semibold shadow-card transition-colors',
              filter === id ? 'bg-ink text-on-ink' : 'bg-card text-ink',
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      <div className="absolute top-20 right-4 z-10 rounded-2xl bg-card p-3 shadow-card">
        <p className="mb-2 text-xs font-semibold text-ink">{t('map.legendTitle')}</p>
        <ul className="space-y-1.5">
          {DEMO_MAP.legend.map((level) => (
            <li key={level} className="flex items-center gap-2 text-xs font-medium text-ink">
              <span aria-hidden className={cx('size-3 rounded-full', LEGEND_DOT[level])} />
              {t(`risk.${level}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative z-10 mt-auto px-4 pt-4 pb-24">
        <Card className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg leading-tight font-bold text-ink">{t('map.sheetStreet')}</h2>
            <RiskBadge level={DEMO_MAP.sheetLevel} />
          </div>
          <p className="text-sm leading-snug text-muted-foreground">{t('map.sheetNote')}</p>
          <ButtonLink to="/scan" className="w-full">
            {t('map.ctaReport')}
          </ButtonLink>
        </Card>
        <div className="mt-2 flex items-center gap-2">
          <DemoTag />
          <p className="text-[11px] leading-snug text-muted-foreground">{t('map.demoNote')}</p>
        </div>
      </div>
    </section>
  )
}