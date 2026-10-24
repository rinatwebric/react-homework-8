import { ArrowRight, Droplets, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEMO_HOME } from '../../config/demo'
import { PILOT_ZONE } from '../../config/pilot'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { DemoTag } from '../../shared/ui/DemoTag'
import { EmergencyCallButton } from '../../shared/ui/EmergencyCallButton'
import { RiskScale } from '../../shared/ui/RiskScale'
import { ScreenHeader } from '../../shared/ui/ScreenHeader'
import { RainWarningBanner } from '../weather/components/RainWarningBanner'
import { WeatherCard } from '../weather/components/WeatherCard'
import { useWeather } from '../weather/hooks/useWeather'

export function WaterPage() {
  const { t } = useTranslation()
  const { weather, loading, refresh } = useWeather({
    lat: PILOT_ZONE.center.lat,
    lng: PILOT_ZONE.center.lng,
  })

  return (
    <div className="space-y-4">
      <ScreenHeader
        title={t('water.title', 'О воде и погоде')}
      />
      <p className="-mt-2 text-sm leading-snug text-muted-foreground">
        {t('water.subtitle', 'Сводка погоды Open-Meteo, уровень осадков и рекомендации по безопасности села')}
      </p>

      {/* Предупреждение об осадках */}
      <RainWarningBanner weather={weather} />

      {/* Погодная сводка */}
      <WeatherCard weather={weather} loading={loading} onRefresh={() => void refresh()} />

      {/* Карточка гидрологического риска */}
      <Card tone="ink" className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-on-ink/70">
            {t('home.riskLabel', 'Риск подтопления сегодня')}
          </p>
          <Droplets className="size-5 text-aqua" />
        </div>
        <p className="text-4xl font-extrabold tracking-tight">{t(`risk.${DEMO_HOME.level}`)}</p>
        <RiskScale level={DEMO_HOME.level} />
        <p className="text-[15px] leading-snug text-on-ink/85">{t('home.riskAdvice')}</p>

        <ButtonLink to="/report" className="w-full">
          {t('home.ctaReport', 'Сообщить о воде')}
          <ArrowRight aria-hidden className="size-5" strokeWidth={2.5} />
        </ButtonLink>
      </Card>

      {/* Экстренная помощь 112 */}
      <EmergencyCallButton />

      {/* Советы жителям */}
      <Card className="flex gap-3 p-4">
        <ShieldAlert aria-hidden className="size-5 shrink-0 text-brand mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-brand">
            {t('water.tipsTitle', 'Профилактика подтоплений')}
          </p>
          <p className="text-ink leading-relaxed">
            {t(
              'water.tipsText',
              'Следите за чистотой арыков и водоотводов перед дождём. При появлении сырости в подвале сразу проверьте вентиляционные продухи.',
            )}
          </p>
        </div>
      </Card>

      <div className="flex items-start gap-2">
        <DemoTag />
        <p className="text-xs leading-snug text-muted-foreground">
          {t('water.disclaimer', 'Данные погоды предоставлены Open-Meteo (справочно, не прогноз МЧС).')}
        </p>
      </div>
    </div>
  )
}
