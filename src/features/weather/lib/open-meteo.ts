import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { z } from 'zod'
import type { WeatherCurrent, WeatherDayForecast } from '../types'

/**
 * Валидация сырого ответа Open-Meteo на клиенте (используется и для fallback-запросов).
 */
export const openMeteoResponseSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
    relative_humidity_2m: z.number(),
    precipitation: z.number(),
    weather_code: z.number(),
  }),
  hourly: z
    .object({
      time: z.array(z.string()).optional(),
      precipitation_probability: z.array(z.number().nullable()).optional(),
      precipitation: z.array(z.number().nullable()).optional(),
    })
    .optional(),
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    precipitation_sum: z.array(z.number().nullable()),
    precipitation_probability_max: z.array(z.number().nullable()),
    weather_code: z.array(z.number().nullable()),
  }),
})

export interface WeatherVisual {
  icon: LucideIcon
  labelKey: string
}

/**
 * Маппинг кодов погоды WMO на иконки и ключи локализации.
 */
export function getWeatherVisual(code: number): WeatherVisual {
  switch (code) {
    case 0:
      return { icon: Sun, labelKey: 'weather.conditions.clear' }
    case 1:
      return { icon: Sun, labelKey: 'weather.conditions.mainlyClear' }
    case 2:
      return { icon: CloudSun, labelKey: 'weather.conditions.partlyCloudy' }
    case 3:
      return { icon: Cloud, labelKey: 'weather.conditions.overcast' }
    case 45:
    case 48:
      return { icon: CloudFog, labelKey: 'weather.conditions.fog' }
    case 51:
    case 53:
    case 55:
      return { icon: CloudDrizzle, labelKey: 'weather.conditions.drizzle' }
    case 56:
    case 57:
      return { icon: CloudDrizzle, labelKey: 'weather.conditions.freezingDrizzle' }
    case 61:
    case 63:
      return { icon: CloudRain, labelKey: 'weather.conditions.rain' }
    case 65:
      return { icon: CloudRain, labelKey: 'weather.conditions.heavyRain' }
    case 66:
    case 67:
      return { icon: CloudRain, labelKey: 'weather.conditions.freezingRain' }
    case 71:
    case 73:
    case 75:
    case 77:
      return { icon: CloudSnow, labelKey: 'weather.conditions.snow' }
    case 80:
    case 81:
      return { icon: CloudRain, labelKey: 'weather.conditions.rainShowers' }
    case 82:
      return { icon: CloudRain, labelKey: 'weather.conditions.violentShowers' }
    case 85:
    case 86:
      return { icon: CloudSnow, labelKey: 'weather.conditions.snowShowers' }
    case 95:
      return { icon: CloudLightning, labelKey: 'weather.conditions.thunderstorm' }
    case 96:
    case 99:
      return { icon: CloudLightning, labelKey: 'weather.conditions.thunderstormHail' }
    default:
      return { icon: Cloud, labelKey: 'weather.conditions.cloudy' }
  }
}

/**
 * Пороговое правило показа баннера осадков (§10):
 * precip_probability >= 60% ИЛИ precip_mm > 5 в ближайшие 24 часа.
 */
export function shouldShowRainWarning(params: {
  precip_probability: number
  precip_mm: number
}): boolean {
  return params.precip_probability >= 60 || params.precip_mm > 5
}

/**
 * Преобразование ответа Open-Meteo в структуру WeatherCurrent.
 */
export function parseOpenMeteoResponse(raw: unknown): WeatherCurrent {
  const parsed = openMeteoResponseSchema.parse(raw)
  const current = parsed.current
  const daily = parsed.daily

  const precipProbability = daily.precipitation_probability_max[0] ?? 0

  const days: WeatherDayForecast[] = []
  const count = Math.min(daily.time.length, 4)
  for (let i = 1; i < count; i++) {
    days.push({
      date: daily.time[i] ?? '',
      t_max: Math.round((daily.temperature_2m_max[i] ?? 0) * 10) / 10,
      t_min: Math.round((daily.temperature_2m_min[i] ?? 0) * 10) / 10,
      precip_mm: Math.round((daily.precipitation_sum[i] ?? 0) * 10) / 10,
      precip_prob: Math.round(daily.precipitation_probability_max[i] ?? 0),
      weather_code: daily.weather_code[i] ?? 0,
    })
  }

  return {
    temp_c: Math.round(current.temperature_2m * 10) / 10,
    humidity: Math.round(current.relative_humidity_2m),
    precip_mm: Math.round(current.precipitation * 10) / 10,
    precip_probability: Math.round(precipProbability),
    weather_code: current.weather_code,
    updated_at: new Date().toISOString(),
    days,
  }
}

/**
 * Форматирование температуры со знаком плюс для положительных значений.
 */
export function formatTemperature(c: number): string {
  const rounded = Math.round(c)
  if (rounded === 0 || Object.is(rounded, -0)) return '0°'
  if (rounded > 0) return `+${rounded}°`
  return `${rounded}°`
}
