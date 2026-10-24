import { CloudRain } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Banner } from '../../../shared/ui/Banner'
import type { WeatherCurrent } from '../types'
import { shouldShowRainWarning } from '../lib/open-meteo'

interface RainWarningBannerProps {
  weather: WeatherCurrent | null
}

/**
 * Баннер предупреждения об осадках (§10):
 * Показывается при precip_probability >= 60% или precip_mm > 5.
 * Текст: «Ожидаются осадки — проверьте подвалы, арыки и места скопления воды».
 */
export function RainWarningBanner({ weather }: RainWarningBannerProps) {
  const { t } = useTranslation()

  if (!weather) return null

  // Проверяем текущие условия или прогноз на ближайшие 24 часа
  const todayForecast = weather.days[0]
  const precipProbability = Math.max(
    weather.precip_probability,
    todayForecast?.precip_prob ?? 0,
  )
  const precipMm = Math.max(weather.precip_mm, todayForecast?.precip_mm ?? 0)

  const showWarning = shouldShowRainWarning({
    precip_probability: precipProbability,
    precip_mm: precipMm,
  })

  if (!showWarning) return null

  return (
    <Banner tone="warning">
      <div className="flex items-start gap-2">
        <CloudRain aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
        <div>
          <p className="font-bold">{t('weather.rainWarningTitle')}</p>
          <p className="text-xs leading-snug">{t('weather.rainWarning')}</p>
        </div>
      </div>
    </Banner>
  )
}
