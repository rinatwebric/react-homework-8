import { useCallback, useEffect, useState } from 'react'
import type { WeatherCurrent } from '../types'
import { fetchWeatherCurrent, getCachedWeather } from '../lib/weather-api'

interface UseWeatherOptions {
  lat?: number
  lng?: number
}

export function useWeather(options?: UseWeatherOptions) {
  const [weather, setWeather] = useState<WeatherCurrent | null>(() => getCachedWeather())
  const [loading, setLoading] = useState<boolean>(() => getCachedWeather() === null)
  const [error, setError] = useState<string | null>(null)

  const lat = options?.lat
  const lng = options?.lng

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchWeatherCurrent(lat, lng)
      if (data) {
        setWeather(data)
      } else if (!weather) {
        setError('weather.unavailable')
      }
    } catch {
      if (!weather) {
        setError('weather.unavailable')
      }
    } finally {
      setLoading(false)
    }
  }, [lat, lng, weather])

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng])

  return {
    weather,
    loading,
    error,
    refresh,
  }
}
