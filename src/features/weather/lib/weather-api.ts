import { edgeFunctionUrl, supabaseConfig } from '../../../shared/lib/supabase'
import type { WeatherCurrent } from '../types'
import { parseOpenMeteoResponse } from './open-meteo'

const WEATHER_CACHE_KEY = 'suutech_weather_cache_v1'
const DEFAULT_LAT = 42.1333
const DEFAULT_LNG = 76.8833

interface LocalWeatherCache {
  data: WeatherCurrent
  timestamp: number
}

/**
 * Чтение сохранённой погоды из localStorage (для быстрого старта и работы офлайн).
 */
export function getCachedWeather(): WeatherCurrent | null {
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY)
    if (!raw) return null
    const parsed: LocalWeatherCache = JSON.parse(raw)
    return parsed.data ?? null
  } catch {
    return null
  }
}

/**
 * Сохранение погоды в localStorage.
 */
export function saveCachedWeather(data: WeatherCurrent): void {
  try {
    const entry: LocalWeatherCache = { data, timestamp: Date.now() }
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(entry))
  } catch {
    // Игнорируем квоты localStorage
  }
}

/**
 * Запрос актуальной погоды:
 * 1) Edge Function `weather-current` (кэш на сервере 30 мин)
 * 2) При сбое — прямой запрос к Open-Meteo (бесплатный, без ключа)
 * 3) При полном отсутствии сети — кэш из localStorage
 */
export async function fetchWeatherCurrent(
  lat: number = DEFAULT_LAT,
  lng: number = DEFAULT_LNG,
): Promise<WeatherCurrent | null> {
  const roundedLat = Math.round(lat * 100) / 100
  const roundedLng = Math.round(lng * 100) / 100

  // 1. Попытка через Edge Function
  if (supabaseConfig) {
    try {
      const url = `${edgeFunctionUrl('weather-current')}?lat=${roundedLat}&lng=${roundedLng}`
      const response = await fetch(url, {
        headers: {
          apikey: supabaseConfig.anonKey,
          Authorization: `Bearer ${supabaseConfig.anonKey}`,
        },
      })

      if (response.ok) {
        const data = (await response.json()) as WeatherCurrent
        saveCachedWeather(data)
        return data
      }
    } catch (edgeError) {
      console.warn('[weather-api] Edge function недоступна, пробуем прямой запрос', edgeError)
    }
  }

  // 2. Прямой запрос к Open-Meteo как надежный fallback
  try {
    const directUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat.toFixed(2)}&longitude=${roundedLng.toFixed(2)}` +
      `&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code` +
      `&hourly=precipitation_probability,precipitation` +
      `&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code` +
      `&forecast_days=4&timezone=auto`

    const directResponse = await fetch(directUrl)
    if (directResponse.ok) {
      const json = await directResponse.json()
      const data = parseOpenMeteoResponse(json)
      saveCachedWeather(data)
      return data
    }
  } catch (directError) {
    console.warn('[weather-api] Прямой запрос к Open-Meteo не удался', directError)
  }

  // 3. Fallback на локальный кэш
  return getCachedWeather()
}
