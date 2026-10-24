import { MapPin, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GEO_WEAK_ACCURACY_M } from '../../../config/report'
import { formatAccuracy, type LatLng } from '../../../shared/lib/geo'
import { MAX_LOCATION_ADJUST_M } from '../../../shared/types/report-contract'
import { Banner } from '../../../shared/ui/Banner'
import { Button } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { LoadingState } from '../../../shared/ui/LoadingState'
import type { GeolocationState } from '../hooks/useGeolocation'
import { LocationPicker } from './LocationPicker'

type LocationSectionProps = {
  state: GeolocationState
  refining: boolean
  /** Смещение пина от GPS, метры. */
  offsetM: number | null
  availability: 'ready' | 'insecure' | 'unsupported'
  onRelocate: () => void
  onPlaceManually: () => void
  onMove: (point: LatLng) => void
}

/**
 * Блок геопозиции: карта с перетаскиваемым пином, точность GPS и честное
 * объяснение, если браузер не дал координаты. Без координат отправка закрыта.
 *
 * Пин ограничен радиусом 300 м от GPS (§7.2) — не подсказка, а жёсткое правило,
 * поэтому упор в границу подписан отдельно: житель должен понимать, почему
 * метка перестала двигаться.
 */
export function LocationSection({
  state,
  refining,
  offsetM,
  availability,
  onRelocate,
  onPlaceManually,
  onMove,
}: LocationSectionProps) {
  const { t } = useTranslation()

  const accuracyM = state.manual ? null : (state.gps?.accuracyM ?? null)
  const weakAccuracy = !state.manual && accuracyM !== null && accuracyM > GEO_WEAK_ACCURACY_M
  const nearLimit = offsetM !== null && offsetM >= MAX_LOCATION_ADJUST_M - 1

  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-ink">{t('report.location.title')}</h2>

      {availability === 'insecure' ? (
        <Banner tone="warning" title={t('report.location.insecureTitle')}>
          {t('report.location.insecureText')}
        </Banner>
      ) : null}

      {availability === 'unsupported' ? (
        <Banner tone="warning">{t('report.location.unsupported')}</Banner>
      ) : null}

      {state.status === 'locating' ? (
        <Card className="py-2">
          <LoadingState
            label={refining ? t('report.location.refining') : t('report.location.locating')}
          />
        </Card>
      ) : null}

      {state.status === 'ready' && state.point ? (
        <div className="space-y-2">
          <LocationPicker
            point={state.point}
            gps={state.gps}
            accuracyM={accuracyM}
            onMove={onMove}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-soft px-3 py-1.5 text-xs font-semibold text-ink">
              <MapPin aria-hidden className="size-3.5" strokeWidth={2.5} />
              {state.manual || accuracyM === null
                ? t('report.location.manual')
                : t('report.location.accuracy', { accuracy: formatAccuracy(accuracyM) })}
            </span>
            <Button variant="ghost" size="md" onClick={onRelocate} className="shrink-0 px-3">
              <RefreshCw aria-hidden className="size-4" strokeWidth={2.5} />
              {t('report.location.refresh')}
            </Button>
          </div>

          {refining ? (
            <p className="text-xs text-muted-foreground">{t('report.location.refiningHint')}</p>
          ) : null}

          {weakAccuracy ? <Banner tone="warning">{t('report.location.weakAccuracy')}</Banner> : null}

          {state.clamped || nearLimit ? (
            <Banner tone="warning">
              {t('report.location.limit', { meters: MAX_LOCATION_ADJUST_M })}
            </Banner>
          ) : offsetM !== null && offsetM > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t('report.location.offset', { meters: Math.round(offsetM) })}
            </p>
          ) : null}
        </div>
      ) : null}

      {state.status === 'denied' || state.status === 'failed' ? (
        <Card className="space-y-3">
          <Banner
            tone="warning"
            title={
              state.status === 'denied'
                ? t('report.location.deniedTitle')
                : t('report.location.failedTitle')
            }
          >
            {state.status === 'denied'
              ? t('report.location.deniedText')
              : t(`report.location.errors.${state.code ?? 'POSITION_UNAVAILABLE'}`)}
          </Banner>
          <div className="space-y-2">
            <Button variant="ink" className="w-full" onClick={onPlaceManually}>
              <MapPin aria-hidden className="size-5" strokeWidth={2.25} />
              {t('report.location.manualCta')}
            </Button>
            <Button variant="outline" className="w-full" onClick={onRelocate}>
              <RefreshCw aria-hidden className="size-5" strokeWidth={2.25} />
              {t('report.location.retry')}
            </Button>
          </div>
          <p className="text-xs leading-snug text-muted-foreground">
            {t('report.location.manualNote')}
          </p>
        </Card>
      ) : null}
    </section>
  )
}