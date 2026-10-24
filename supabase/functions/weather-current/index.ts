import { z } from 'npm:zod@4.6.7'

/**
 * CORS для Edge Function weather-current
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function preflightResponse(): Response {
  return new Response(null, { status: 204, headers: corsHeaders })
}

/**
 * Edge Function `weather-current` — Срез 3 (ТЗ v2.0 §10, скилл suutech-weather).
 *
 * Бесплатный Open-Meteo API (без API-ключа).
 * Принимает ?lat&lng (координаты пользователя) либо использует координаты
 * пилота Ак-Өлөң (42.1333, 76.8833).
 *
 * Округление координат до 0.01 для кэширования.
 * Кэш в памяти с TTL 30 минут + fallback на последний кэш при таймаутах.
 */

export interface WeatherDayForecast {
  date: string
  t_max: number
  t_min: number
  precip_mm: number
  precip_prob: number
  weather_code: number
}

export interface WeatherCurrentResponse {
  temp_c: number
  humidity: number
  precip_mm: number
  precip_probability: number
  weather_code: number
  updated_at: string
  days: WeatherDayForecast[]
}

const openMeteoResponseSchema = z.object({
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

const DEFAULT_LAT = 42.1333
const DEFAULT_LNG = 76.8833
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 минут

interface CacheEntry {
  data: WeatherCurrentResponse
  cachedAt: number
}

const memoryCache = new Map<string, CacheEntry>()

export function parseCoordinates(url: URL): { lat: number; lng: number } {
  const latStr = url.searchParams.get('lat')
  const lngStr = url.searchParams.get('lng')

  let lat = latStr !== null ? Number.parseFloat(latStr) : DEFAULT_LAT
  let lng = lngStr !== null ? Number.parseFloat(lngStr) : DEFAULT_LNG

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    lat = DEFAULT_LAT
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    lng = DEFAULT_LNG
  }

  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  }
}

export function buildOpenMeteoUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lng.toFixed(2),
    current: 'temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code',
    hourly: 'precipitation_probability,precipitation',
    daily: 'precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min,weather_code',
    forecast_days: '4',
    timezone: 'auto',
  })
  return `https://api.open-meteo.com/v1/forecast?${params.toString()}`
}

export function transformOpenMeteo(raw: unknown): WeatherCurrentResponse {
  const parsed = openMeteoResponseSchema.parse(raw)

  const current = parsed.current
  const daily = parsed.daily

  // Вероятность осадков на сегодня
  const precipProbability = daily.precipitation_probability_max[0] ?? 0

  // 3 будущих дня прогноза (индексы 1..3)
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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return preflightResponse()
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED', message: 'Только GET или POST' }, 405)
  }

  const url = new URL(req.url)
  const { lat, lng } = parseCoordinates(url)
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`
  const cached = memoryCache.get(cacheKey)

  const now = Date.now()
  if (cached && now - cached.cachedAt < CACHE_TTL_MS) {
    return jsonResponse(cached.data, 200)
  }

  try {
    const openMeteoUrl = buildOpenMeteoUrl(lat, lng)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    const response = await fetch(openMeteoUrl, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)

    if (!response.ok) {
      throw new Error(`Open-Meteo HTTP ${response.status}`)
    }

    const json = await response.json()
    const weatherData = transformOpenMeteo(json)

    memoryCache.set(cacheKey, { data: weatherData, cachedAt: now })

    return jsonResponse(weatherData, 200)
  } catch (error) {
    console.error(`[weather-current] Ошибка получения погоды: ${String(error)}`)

    // Если есть устаревший кэш — отдаём его (stale-while-revalidate)
    if (cached) {
      return jsonResponse(cached.data, 200)
    }

    return jsonResponse(
      {
        error: 'WEATHER_UNAVAILABLE',
        message: 'Не удалось получить данные о погоде от поставщика Open-Meteo',
      },
      502,
    )
  }
})
