import { useTranslation } from 'react-i18next'
import { PILOT_ZONE } from '../../config/pilot'
import { ScreenHeader } from '../../shared/ui/ScreenHeader'
import { RainWarningBanner } from './components/RainWarningBanner'
import { WeatherCard } from './components/WeatherCard'
import { useWeather } from './hooks/useWeather'

export function WeatherPage() {
  const { t } = useTranslation()
  const { weather, loading, refresh } = useWeather({
    lat: PILOT_ZONE.center.lat,
    lng: PILOT_ZONE.center.lng,
  })

  return (
    <div className="space-y-4">
      <ScreenHeader title={t('weather.pageTitle', 'Погода')} />
      <p className="-mt-2 text-sm leading-snug text-muted-foreground">
        {PILOT_ZONE.nameRu} ({t('weather.region', 'Иссык-Кульская область')})
      </p>

      {/* Баннер предупреждения об осадках */}
      <RainWarningBanner weather={weather} />

      {/* Полная карточка погоды Open-Meteo с прогнозом на 3 дня */}
      <WeatherCard weather={weather} loading={loading} onRefresh={() => void refresh()} />
    </div>
  )
}
