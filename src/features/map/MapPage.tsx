import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import type { RiskLevel } from '../../config/risk'
import { ButtonLink } from '../../shared/ui/Button'
import { EmptyState } from '../../shared/ui/EmptyState'
import { ErrorState } from '../../shared/ui/ErrorState'
import { LoadingState } from '../../shared/ui/LoadingState'
import { CountryMap } from './components/CountryMap'
import { MapFiltersBar } from './components/MapFiltersBar'
import { MapLegend } from './components/MapLegend'
import { ZoneInfoCard } from './components/ZoneInfoCard'
import type { ZoneSelection } from './components/ZoneLayer'
import { usePublicReports } from './hooks/usePublicReports'
import { useZoneGeo } from './hooks/useZoneGeo'
import { useZoneRisk } from './hooks/useZoneRisk'
import {
  filterReports,
  hasActiveFilters,
  parseMapFilters,
  serializeMapFilters,
  type MapFilters,
} from './lib/map-filters'
import { countReportsByZone } from './lib/zone-contains'
import type { ZoneCollection } from './lib/zone-geojson'

/** Стабильная пустая карта уровней: новый Map на каждый рендер перерисовывал бы все зоны. */
const NO_LEVELS = new Map<string, RiskLevel>()

/**
 * Срез 2: карта всей страны — зоны областей/районов по уровню риска и метки отчётов
 * жителей. Читаем только публичные данные (`reports_public`, `zone_risk`), точные
 * координаты остаются для `/admin`. Чанк с Leaflet грузится лениво.
 */
export default function MapPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selected, setSelected] = useState<ZoneSelection | null>(null)

  const adm1 = useZoneGeo('ADM1')
  const adm2 = useZoneGeo('ADM2')
  const risk = useZoneRisk()
  const reports = usePublicReports()

  const filters = useMemo(() => parseMapFilters(searchParams), [searchParams])
  const handleFilters = useCallback(
    (next: MapFilters) => setSearchParams(serializeMapFilters(next), { replace: true }),
    [setSearchParams],
  )

  // «Сейчас» фиксируем на монтирование: иначе период пересчитывался бы на каждый рендер.
  const now = useMemo(() => new Date(), [])

  const visibleReports = useMemo(
    () => (reports.status === 'ready' ? filterReports(reports.data, filters, now) : []),
    [reports, filters, now],
  )

  const reportsByZone = useMemo(() => {
    const collections = [
      adm1.status === 'ready' ? adm1.data : null,
      adm2.status === 'ready' ? adm2.data : null,
    ].filter((item): item is ZoneCollection => item !== null)

    if (collections.length === 0) return new Map<string, number>()

    // zone_id отчёта — слаг пилота, ключ границ — shapeID: раскладываем отчёты геометрией.
    return countReportsByZone(visibleReports, collections)
  }, [adm1, adm2, visibleReports])

  const zonesError = (adm1.status === 'error' && adm1) || (adm2.status === 'error' && adm2) || null
  const zonesLoading = adm1.status === 'loading' || adm2.status === 'loading'
  const levels = risk.status === 'ready' ? risk.data : NO_LEVELS

  return (
    <section className="relative -mx-4 -mt-6 -mb-28 flex min-h-[calc(100dvh-1.5rem)] flex-col bg-background">
      <h1 className="sr-only">{t('map.title')}</h1>

      <header className="space-y-3 px-4 pt-4">
        <div>
          <p className="text-xs font-semibold tracking-wide text-brand uppercase">
            {t('map.kicker')}
          </p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground">{t('map.lead')}</p>
        </div>
        <MapFiltersBar filters={filters} onChange={handleFilters} />
      </header>

      <div className="relative mx-4 mt-3 flex min-h-[280px] flex-1 flex-col">
        {zonesError ? (
          <ErrorState
            title={t('map.zonesErrorTitle')}
            message={t('map.zonesErrorText')}
            className="rounded-card border border-border bg-card"
          />
        ) : zonesLoading ? (
          <LoadingState
            label={t('map.zonesLoading')}
            className="rounded-card border border-border bg-card"
          />
        ) : (
          <CountryMap
            adm1={adm1.status === 'ready' ? adm1.data : null}
            adm2={adm2.status === 'ready' ? adm2.data : null}
            levels={levels}
            reports={visibleReports}
            selectedId={selected?.id ?? null}
            onSelectZone={setSelected}
            className="min-h-[280px] flex-1"
          />
        )}

        {selected ? (
          <div className="absolute bottom-2 left-2 z-[500] w-[min(18rem,calc(100%-1rem))]">
            <ZoneInfoCard
              zoneName={selected.name}
              level={selected.level}
              reports={reportsByZone.get(selected.id) ?? 0}
              onClose={() => setSelected(null)}
            />
          </div>
        ) : null}
      </div>

      <div className="space-y-2 px-4 pt-3 pb-28">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">
            {t('map.count', { count: visibleReports.length })}
          </p>
          {reports.status === 'loading' ? (
            <p className="text-xs text-muted-foreground">{t('states.loading')}</p>
          ) : null}
        </div>

        <MapLegend />

        {risk.status === 'error' ? (
          <p className="text-xs leading-snug text-muted-foreground">{t('map.riskErrorText')}</p>
        ) : null}

        {reports.status === 'error' ? (
          <ErrorState title={t('map.reportsErrorTitle')} message={t('map.reportsErrorText')} />
        ) : null}

        {reports.status === 'ready' && visibleReports.length === 0 ? (
          <EmptyState
            title={hasActiveFilters(filters) ? t('map.emptyFilteredTitle') : t('map.emptyTitle')}
            message={hasActiveFilters(filters) ? t('map.emptyFilteredText') : t('map.emptyText')}
          />
        ) : null}

        <ButtonLink to="/report" className="w-full">
          {t('map.ctaReport')}
        </ButtonLink>
        <p className="text-[11px] leading-snug text-muted-foreground">{t('map.demoNote')}</p>
      </div>
    </section>
  )
}