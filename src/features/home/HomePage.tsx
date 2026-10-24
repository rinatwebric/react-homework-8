import { ArrowRight, Bell, CloudRain, MapPin, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { features } from '../../config/features'
import { PILOT_ZONE } from '../../config/pilot'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { EmergencyCallButton } from '../../shared/ui/EmergencyCallButton'
import { IconTile } from '../../shared/ui/IconTile'
import { RiskScale } from '../../shared/ui/RiskScale'
import type { RiskLevel } from '../../config/risk'
import { fetchRecentAlerts } from '../alerts/alerts-api'
import type { AlertItem } from '../alerts/types'
import { ActiveAlertBanner } from './components/ActiveAlertBanner'
import { RecentAlertsList } from './components/RecentAlertsList'
import { RainWarningBanner } from '../weather/components/RainWarningBanner'
import { useWeather } from '../weather/hooks/useWeather'

const TILES = [
  { to: '/map', icon: MapPin, titleKey: 'home.tiles.mapTitle', textKey: 'home.tiles.mapText' },
  { to: '/report', icon: Plus, titleKey: 'home.tiles.reportTitle', textKey: 'home.tiles.reportText' },
] as const

/** Главная: село, оперативный риск подтопления по погоде, предупреждения, сводка погоды и 112. */
export function HomePage() {
  const { t } = useTranslation()
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [alerts, setAlerts] = useState<AlertItem[]>([])

  const { weather } = useWeather({
    lat: PILOT_ZONE.center.lat,
    lng: PILOT_ZONE.center.lng,
  })

  // Загружаем недавние предупреждения службы
  useEffect(() => {
    let isMounted = true
    void fetchRecentAlerts(48).then((data) => {
      if (isMounted) {
        setAlerts(data)
      }
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Расчёт фактического уровня риска подтопления на основе погоды в пилотной зоне
  const riskLevel: RiskLevel = useMemo(() => {
    if (!weather) return 'normal'
    if (weather.precip_mm >= 15) return 'critical'
    if (weather.precip_mm >= 5) return 'high'
    if (weather.precip_mm >= 1) return 'elevated'
    return 'normal'
  }, [weather])

  const riskAdvice = useMemo(() => {
    if (riskLevel === 'critical') {
      return t('home.riskAdviceCritical', 'Критический объем осадков! Возможен резкий подъем воды в арыках и подвалах.')
    }
    if (riskLevel === 'high') {
      return t('home.riskAdviceHigh', 'Высокий уровень осадков. Проверьте дренажи, арыки и места скопления воды.')
    }
    if (riskLevel === 'elevated') {
      return t('home.riskAdviceElevated', 'Ожидаются осадки. Проверьте подвал и очистите канаву у дома.')
    }
    return t('home.riskAdviceNormal', 'Осадков не ожидается. Уровень грунтовых вод в пределах сезонной нормы.')
  }, [riskLevel, t])

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t('home.villageLabel')}</p>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-ink">
            {PILOT_ZONE.nameRu}
          </h1>
        </div>
        <button
          type="button"
          aria-label={t('home.bellLabel')}
          aria-expanded={alertsOpen}
          onClick={() => setAlertsOpen((open) => !open)}
          className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-card text-ink shadow-card transition-colors hover:bg-muted/40"
        >
          <Bell aria-hidden className="size-6" strokeWidth={2} />
          {alerts.length > 0 && (
            <span
              title={`Оповещений: ${alerts.length}`}
              className="absolute top-3 right-3 flex size-3 items-center justify-center rounded-full bg-rose-600 ring-2 ring-card"
            />
          )}
        </button>
      </header>

      {/* Выпадающий блок со списком активных оповещений службы при клике на колокольчик */}
      {alertsOpen && <RecentAlertsList alerts={alerts} />}

      {/* Оперативное предупреждение службы (Срез 5, ТЗ v2.0 §13) */}
      <ActiveAlertBanner />

      {/* Предупреждение о дожде при наличии риска */}
      {features.weather ? <RainWarningBanner weather={weather} /> : null}

      {/* Компактный виджет погоды с переходом во вкладку «Погода» */}
      {features.weather && weather ? (
        <Link
          to="/weather"
          className="flex items-center justify-between rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-transform active:scale-[0.99] hover:border-brand/40"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <CloudRain className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                {t('weather.title', 'Погода в селе')}
              </p>
              <p className="text-sm font-bold text-ink">
                {weather.temp_c != null ? `${weather.temp_c}°C` : '—'}
                {weather.precip_mm != null && weather.precip_mm > 0
                  ? ` · ${weather.precip_mm} мм осадков`
                  : ' · Без осадков'}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-semibold text-brand">
            {t('nav.weather', 'Погода')} <ArrowRight className="size-3.5" />
          </span>
        </Link>
      ) : null}

      <EmergencyCallButton />

      {/* Карточка риска подтопления на основе погоды (без демо-плашек) */}
      <Card tone="ink" className="space-y-4 p-6">
        <p className="text-sm font-medium text-on-ink/70">{t('home.riskLabel')}</p>
        <p className="text-4xl font-extrabold tracking-tight">{t(`risk.${riskLevel}`)}</p>
        <RiskScale level={riskLevel} />
        <p className="text-[15px] leading-snug text-on-ink/85">{riskAdvice}</p>
        <ButtonLink to="/report" className="w-full">
          {t('home.ctaReport')}
          <ArrowRight aria-hidden className="size-5" strokeWidth={2.5} />
        </ButtonLink>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ to, icon: Icon, titleKey, textKey }) => (
          <Link
            key={titleKey}
            to={to}
            className="rounded-card bg-card p-4 shadow-card transition-transform active:scale-[0.99]"
          >
            <IconTile icon={Icon} />
            <p className="mt-3 font-semibold text-ink">{t(titleKey)}</p>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{t(textKey)}</p>
          </Link>
        ))}
      </div>

      <Card className="flex gap-3 p-4">
        <span aria-hidden className="w-1.5 shrink-0 rounded-full bg-brand" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-brand">{t('home.tipTitle')}</p>
          <p className="text-[15px] leading-snug text-ink">{t('home.tipText')}</p>
        </div>
      </Card>
    </div>
  )
}
