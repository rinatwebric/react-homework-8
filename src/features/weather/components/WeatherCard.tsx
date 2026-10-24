import { Droplets, CloudRain, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../../shared/ui/Card'
import type { WeatherCurrent } from '../types'
import { formatTemperature, getWeatherVisual } from '../lib/open-meteo'

interface WeatherCardProps {
  weather: WeatherCurrent | null
  loading?: boolean
  onRefresh?: () => void
}

/**
 * Карточка погоды на главной странице (Срез 3, ТЗ v2.0 §10).
 *
 * Отображает:
 * - Крупная температура сейчас
 * - Иконка и текстовое описание состояния погоды
 * - Влажность и текущие осадки
 * - Прогноз на 3 дня вперёд (макс/мин, иконка, вероятность осадков)
 * - Время последнего обновления
 */
export function WeatherCard({ weather, loading, onRefresh }: WeatherCardProps) {
  const { t, i18n } = useTranslation()

  if (!weather) {
    if (loading) {
      return (
        <Card className="flex min-h-36 items-center justify-center p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="size-4 animate-spin" />
            <span>{t('weather.loading')}</span>
          </div>
        </Card>
      )
    }
    return null
  }

  const visual = getWeatherVisual(weather.weather_code)
  const CurrentIcon = visual.icon

  const updatedTime = new Date(weather.updated_at).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <Card className="space-y-4 p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-extrabold tracking-tight text-ink">
              {formatTemperature(weather.temp_c)}
            </span>
            <span className="text-sm font-semibold text-muted-foreground">
              {t(visual.labelKey)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('weather.updatedAt', { time: updatedTime })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand">
            <CurrentIcon aria-hidden className="size-7" strokeWidth={2.25} />
          </div>
          {onRefresh ? (
            <button
              type="button"
              aria-label={t('weather.refresh')}
              onClick={onRefresh}
              disabled={loading}
              className="grid size-10 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted active:scale-95 disabled:opacity-50"
            >
              <RefreshCw
                aria-hidden
                className={`size-4 ${loading ? 'animate-spin' : ''}`}
                strokeWidth={2}
              />
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-2.5">
        <div className="flex items-center gap-2">
          <Droplets aria-hidden className="size-4 text-brand shrink-0" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t('weather.humidity')}</p>
            <p className="text-sm font-bold text-ink">{weather.humidity}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <CloudRain aria-hidden className="size-4 text-brand shrink-0" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t('weather.precipitation')}</p>
            <p className="text-sm font-bold text-ink">
              {weather.precip_mm} {t('weather.mm')}
            </p>
          </div>
        </div>
      </div>

      {weather.days.length > 0 ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('weather.forecast3Days')}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {weather.days.slice(0, 3).map((day) => {
              const dayVisual = getWeatherVisual(day.weather_code)
              const DayIcon = dayVisual.icon
              const dateObj = new Date(day.date)
              const dayName = Number.isNaN(dateObj.getTime())
                ? day.date
                : dateObj.toLocaleDateString(i18n.language, { weekday: 'short', day: 'numeric' })

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center rounded-xl bg-card p-2 text-center border border-border/50"
                >
                  <span className="text-xs font-medium text-muted-foreground capitalize">
                    {dayName}
                  </span>
                  <DayIcon aria-hidden className="my-1.5 size-5 text-brand" strokeWidth={2} />
                  <span className="text-xs font-bold text-ink">
                    {formatTemperature(day.t_max)} / {formatTemperature(day.t_min)}
                  </span>
                  {day.precip_prob > 0 ? (
                    <span className="mt-0.5 text-[10px] font-medium text-blue-600">
                      {day.precip_prob}%
                    </span>
                  ) : (
                    <span className="mt-0.5 text-[10px] text-muted-foreground/60">—</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </Card>
  )
}
