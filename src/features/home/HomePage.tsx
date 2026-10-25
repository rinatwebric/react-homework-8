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
import {
  countUnreadAlerts,
  markAlertsAsSeen,
  notifyNewAlerts,
  syncPushSubscriptionIfGranted,
} from './lib/notification-service'
import { getCachedLocationName, reverseGeocodeVillage } from './lib/user-village'
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
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [userLocation, setUserLocation] = useState<{ name: string; typeLabel: string }>(() => {
    const cached = getCachedLocationName()
    return cached
      ? { name: cached.placeName, typeLabel: cached.typeLabelRu }
      : { name: PILOT_ZONE.nameRu, typeLabel: t('home.villageLabel', 'Ваше село') }
  })

  // Определение фактического местоположения пользователя
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        void reverseGeocodeVillage(latitude, longitude).then((loc) => {
          if (loc?.placeName) {
            setUserLocation({ name: loc.placeName, typeLabel: loc.typeLabelRu })
          }
        })
      },
      () => {
        // При отказе или ошибке GPS остается название пилота
      },
      { timeout: 8000, maximumAge: 60000 },
    )
  }, [])

  // Фоновая синхронизация Web Push подписки при наличии разрешений от пользователя
  useEffect(() => {
    void syncPushSubscriptionIfGranted({
      lat: PILOT_ZONE.center.lat,
      lng: PILOT_ZONE.center.lng,
    })
  }, [])

  const { weather } = useWeather({
    lat: PILOT_ZONE.center.lat,
    lng: PILOT_ZONE.center.lng,
  })

  // Загружаем недавние предупреждения службы и обновляем при возвращении на вкладку
  useEffect(() => {
    let isMounted = true

    const loadAlerts = async () => {
      try {
        const data = await fetchRecentAlerts(48)
        if (!isMounted) return
        setAlerts(data)
        setUnreadCount(countUnreadAlerts(data))
        // Если есть свежие алерты и включены уведомления — отправляем системное уведомление на телефон
        void notifyNewAlerts(data)
      } catch {
        // offline / network issue
      }
    }

    void loadAlerts()

    // Проверка при возвращении на экран
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadAlerts()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Периодический опрос раз в 30 секунд для оперативного получения тревог без ручной перезагрузки
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void loadAlerts()
      }
    }, 30000)

    return () => {
      isMounted = false
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(interval)
    }
  }, [])

  // При открытии списка оповещений сбрасываем счетчик и скрываем красный значок
  const handleToggleAlerts = () => {
    setAlertsOpen((prev) => {
      const next = !prev
      if (next) {
        markAlertsAsSeen()
        setUnreadCount(0)
      }
      return next
    })
  }

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
          <p className="text-sm font-medium text-muted-foreground">{userLocation.typeLabel}</p>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-ink">
            {userLocation.name}
          </h1>
        </div>
        <button
          type="button"
          aria-label={t('home.bellLabel')}
          aria-expanded={alertsOpen}
          onClick={handleToggleAlerts}
          className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-card text-ink shadow-card transition-colors hover:bg-muted/40"
        >
          <Bell aria-hidden className="size-6" strokeWidth={2} />
          {unreadCount > 0 && (
            <span
              title={`Непрочитанных оповещений: ${unreadCount}`}
              className="absolute top-2.5 right-2.5 flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-card animate-in fade-in"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </header>

      {/* Выпадающий блок со списком активных оповещений службы при клике на колокольчик */}
      {alertsOpen && (
        <RecentAlertsList
          alerts={alerts}
          onMarkAllAsRead={() => setUnreadCount(0)}
        />
      )}

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
