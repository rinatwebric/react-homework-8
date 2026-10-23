/**
 * Геолокация формы отчёта: обёртка над Geolocation API.
 *
 * Правила: первый фикс ждём не дольше GEO_TIMEOUT_MS, затем уточняем watchPosition
 * в окне GEO_REFINE_MS и берём лучшую точность. GPS не обязателен для теста на
 * ноутбуке — пин на карте можно поставить вручную, но тогда точка помечается как
 * выбранная руками (см. useGeolocation).
 */
import {
  GEO_GOOD_ACCURACY_M,
  GEO_REFINE_MS,
  GEO_TIMEOUT_MS,
} from '../../../config/report'
import type { LatLng } from '../../../shared/lib/geo'

export type GeoErrorCode =
  | 'INSECURE_CONTEXT'
  | 'UNSUPPORTED'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'

export type GeoFix = LatLng & { accuracyM: number; at: number }

export class GeoError extends Error {
  readonly code: GeoErrorCode

  constructor(code: GeoErrorCode, message: string) {
    super(message)
    this.name = 'GeoError'
    this.code = code
  }
}

const POSITION_ERROR_CODES: Record<number, GeoErrorCode> = {
  1: 'PERMISSION_DENIED',
  2: 'POSITION_UNAVAILABLE',
  3: 'TIMEOUT',
}

/** GeolocationPositionError.code → наш код (для текста на экране). Чистая функция. */
export function geoErrorCode(rawCode: number): GeoErrorCode {
  return POSITION_ERROR_CODES[rawCode] ?? 'POSITION_UNAVAILABLE'
}

type PositionLike = {
  coords: { latitude: number; longitude: number; accuracy: number }
}

/** GeolocationPosition → фикс. Чистая функция (в тестах нет Geolocation API). */
export function readFix(position: PositionLike, now: number = Date.now()): GeoFix {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyM: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : 0,
    at: now,
  }
}

/** Выше — лучше. Кандидат заменит текущий, только если точнее. */
export function pickBetterFix(current: GeoFix | null, next: GeoFix): GeoFix {
  if (!current) return next
  return next.accuracyM < current.accuracyM ? next : current
}

/**
 * Геолокация работает только в защищённом контексте (HTTPS или localhost).
 * На http-IP телефона браузер молча не даст координат — об этом надо сказать честно.
 */
export function geolocationAvailability(): 'ready' | 'insecure' | 'unsupported' {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return 'unsupported'
  if (typeof window === 'undefined') return 'ready'
  const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
  if (!window.isSecureContext && !localhost) return 'insecure'
  return 'ready'
}

function assertAvailable(): void {
  const availability = geolocationAvailability()
  if (availability === 'insecure') {
    throw new GeoError('INSECURE_CONTEXT', 'Для геолокации нужен HTTPS')
  }
  if (availability === 'unsupported') {
    throw new GeoError('UNSUPPORTED', 'Браузер не поддерживает геолокацию')
  }
}

/** Один запрос позиции: нужен для быстрого старта формы. */
export function requestFix(): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    try {
      assertAvailable()
    } catch (error) {
      reject(error)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(readFix(position)),
      (error) =>
        reject(new GeoError(geoErrorCode(error.code), error.message || 'Не удалось определить место')),
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 30_000 },
    )
  })
}

/**
 * Уточнение в окне: watchPosition собирает несколько измерений, отдаём лучшее.
 * Не бросаем ошибку, если до этого был хоть один фикс, — иначе форма «прыгает».
 */
export function refineFix(durationMs: number = GEO_REFINE_MS): Promise<GeoFix> {
  return new Promise((resolve, reject) => {
    try {
      assertAvailable()
    } catch (error) {
      reject(error)
      return
    }

    let best: GeoFix | null = null
    let watchId: number | null = null
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const stopWatch = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    }

    const succeed = () => {
      if (settled || !best) return
      settled = true
      stopWatch()
      resolve(best)
    }

    const fail = (code: GeoErrorCode, message: string) => {
      if (settled) return
      settled = true
      stopWatch()
      if (best) {
        resolve(best)
        return
      }
      reject(new GeoError(code, message))
    }

    timer = setTimeout(succeed, durationMs)
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        best = pickBetterFix(best, readFix(position))
        if ((best?.accuracyM ?? Number.POSITIVE_INFINITY) <= GEO_GOOD_ACCURACY_M) succeed()
      },
      (error) => fail(geoErrorCode(error.code), error.message || 'Не удалось уточнить место'),
      { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 0 },
    )
  })
}