import { describe, expect, it } from 'vitest'
import { mockOpenMeteoRain, mockOpenMeteoSunny } from '../__fixtures__/open-meteo-fixture'
import {
  formatTemperature,
  getWeatherVisual,
  parseOpenMeteoResponse,
  shouldShowRainWarning,
} from './open-meteo'

describe('parseOpenMeteoResponse: преобразование сырого ответа Open-Meteo', () => {
  it('корректно преобразует ясную погоду', () => {
    const result = parseOpenMeteoResponse(mockOpenMeteoSunny)

    expect(result.temp_c).toBe(14.2)
    expect(result.humidity).toBe(35)
    expect(result.precip_mm).toBe(0)
    expect(result.precip_probability).toBe(10)
    expect(result.weather_code).toBe(0)
    expect(result.days).toHaveLength(3)

    // Проверяем первый день прогноза (завтра: индекс 1)
    expect(result.days[0]).toEqual({
      date: '2026-10-25',
      t_max: 15.0,
      t_min: 3.1,
      precip_mm: 0.0,
      precip_prob: 5,
      weather_code: 1,
    })
  })

  it('корректно преобразует дождливую погоду с осадками', () => {
    const result = parseOpenMeteoResponse(mockOpenMeteoRain)

    expect(result.temp_c).toBe(8.5)
    expect(result.humidity).toBe(88)
    expect(result.precip_mm).toBe(3.4)
    expect(result.precip_probability).toBe(90)
    expect(result.weather_code).toBe(63)
    expect(result.days[0]?.weather_code).toBe(61)
  })

  it('выбрасывает ошибку при невалидном ответе API', () => {
    expect(() => parseOpenMeteoResponse({})).toThrow()
    expect(() => parseOpenMeteoResponse({ current: null })).toThrow()
  })
})

describe('shouldShowRainWarning: пороговое правило баннера осадков (§10)', () => {
  it('59% вероятности осадков и <= 5 мм — НЕ показывает баннер (false)', () => {
    expect(shouldShowRainWarning({ precip_probability: 59, precip_mm: 0 })).toBe(false)
    expect(shouldShowRainWarning({ precip_probability: 59, precip_mm: 5.0 })).toBe(false)
  })

  it('60% вероятности осадков — показывает баннер (true)', () => {
    expect(shouldShowRainWarning({ precip_probability: 60, precip_mm: 0 })).toBe(true)
    expect(shouldShowRainWarning({ precip_probability: 85, precip_mm: 2 })).toBe(true)
  })

  it('5.0 мм осадков без вероятности — НЕ показывает баннер (false)', () => {
    expect(shouldShowRainWarning({ precip_probability: 0, precip_mm: 5.0 })).toBe(false)
  })

  it('5.1 мм осадков (превышение порога 5 мм) — показывает баннер (true)', () => {
    expect(shouldShowRainWarning({ precip_probability: 0, precip_mm: 5.1 })).toBe(true)
    expect(shouldShowRainWarning({ precip_probability: 30, precip_mm: 12.0 })).toBe(true)
  })
})

describe('getWeatherVisual: сопоставление WMO кодов с иконками и текстами', () => {
  it('код 0: ясно', () => {
    const visual = getWeatherVisual(0)
    expect(visual.labelKey).toBe('weather.conditions.clear')
    expect(visual.icon).toBeDefined()
  })

  it('коды 1, 2, 3: облачность', () => {
    expect(getWeatherVisual(1).labelKey).toBe('weather.conditions.mainlyClear')
    expect(getWeatherVisual(2).labelKey).toBe('weather.conditions.partlyCloudy')
    expect(getWeatherVisual(3).labelKey).toBe('weather.conditions.overcast')
  })

  it('коды 45, 48: туман', () => {
    expect(getWeatherVisual(45).labelKey).toBe('weather.conditions.fog')
    expect(getWeatherVisual(48).labelKey).toBe('weather.conditions.fog')
  })

  it('коды 51, 53, 55: морось', () => {
    expect(getWeatherVisual(51).labelKey).toBe('weather.conditions.drizzle')
  })

  it('коды 61, 63, 65: дождь и сильный дождь', () => {
    expect(getWeatherVisual(61).labelKey).toBe('weather.conditions.rain')
    expect(getWeatherVisual(65).labelKey).toBe('weather.conditions.heavyRain')
  })

  it('коды 71..77: снег', () => {
    expect(getWeatherVisual(71).labelKey).toBe('weather.conditions.snow')
  })

  it('коды 95, 96: гроза', () => {
    expect(getWeatherVisual(95).labelKey).toBe('weather.conditions.thunderstorm')
  })

  it('неизвестный код: возвращает дефолтную облачность', () => {
    expect(getWeatherVisual(999).labelKey).toBe('weather.conditions.cloudy')
  })
})

describe('formatTemperature: форматирование со знаком +', () => {
  it('положительные температуры имеют знак +', () => {
    expect(formatTemperature(12.4)).toBe('+12°')
    expect(formatTemperature(0.6)).toBe('+1°')
  })

  it('ноль и отрицательные температуры', () => {
    expect(formatTemperature(0)).toBe('0°')
    expect(formatTemperature(-0.2)).toBe('0°')
    expect(formatTemperature(-5.1)).toBe('-5°')
  })
})
