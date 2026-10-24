/**
 * Типы погодного блока Open-Meteo (Срез 3, ТЗ v2.0 §10).
 */

export interface WeatherDayForecast {
  date: string
  t_max: number
  t_min: number
  precip_mm: number
  precip_prob: number
  weather_code: number
}

export interface WeatherCurrent {
  temp_c: number
  humidity: number
  precip_mm: number
  precip_probability: number
  weather_code: number
  updated_at: string
  days: WeatherDayForecast[]
}
