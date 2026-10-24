/**
 * Фикстуры реальных и синтетических ответов Open-Meteo для тестов.
 */

export const mockOpenMeteoSunny = {
  latitude: 42.13,
  longitude: 76.88,
  generationtime_ms: 0.2,
  utc_offset_seconds: 21600,
  timezone: 'Asia/Bishkek',
  timezone_abbreviation: 'GMT+6',
  elevation: 1754.0,
  current_units: {
    time: 'iso8601',
    interval: 'seconds',
    temperature_2m: '°C',
    relative_humidity_2m: '%',
    precipitation: 'mm',
    rain: 'mm',
    showers: 'mm',
    weather_code: 'wmo code',
  },
  current: {
    time: '2026-10-24T14:00',
    interval: 900,
    temperature_2m: 14.2,
    relative_humidity_2m: 35,
    precipitation: 0.0,
    rain: 0.0,
    showers: 0.0,
    weather_code: 0,
  },
  hourly: {
    time: ['2026-10-24T14:00', '2026-10-24T15:00'],
    precipitation_probability: [0, 5],
    precipitation: [0.0, 0.0],
  },
  daily_units: {
    time: 'iso8601',
    precipitation_sum: 'mm',
    precipitation_probability_max: '%',
    temperature_2m_max: '°C',
    temperature_2m_min: '°C',
    weather_code: 'wmo code',
  },
  daily: {
    time: ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'],
    precipitation_sum: [0.0, 0.0, 1.2, 0.0],
    precipitation_probability_max: [10, 5, 25, 0],
    temperature_2m_max: [16.5, 15.0, 12.3, 13.8],
    temperature_2m_min: [4.2, 3.1, 2.0, 1.5],
    weather_code: [0, 1, 61, 2],
  },
}

export const mockOpenMeteoRain = {
  current: {
    time: '2026-10-24T14:00',
    temperature_2m: 8.5,
    relative_humidity_2m: 88,
    precipitation: 3.4,
    weather_code: 63,
  },
  daily: {
    time: ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'],
    precipitation_sum: [8.5, 4.0, 0.2, 0.0],
    precipitation_probability_max: [90, 70, 30, 10],
    temperature_2m_max: [10.2, 9.0, 11.5, 12.0],
    temperature_2m_min: [4.5, 3.2, 2.8, 3.0],
    weather_code: [63, 61, 3, 1],
  },
}
