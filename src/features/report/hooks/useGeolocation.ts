/**
 * Состояние геолокации формы отчёта.
 *
 * GPS и точка отправки разделены: пользователь может перетащить пин, но исходный
 * фикс остаётся, чтобы показать смещение («пин сдвинут на 40 м от GPS»).
 * Если геолокация запрещена — форму не блокируем: пин ставится вручную,
 * и это честно подписано на экране.
 *
 * Радиус уточнения — 300 м (§7.2): дальше метка не уезжает, даже если палец
 * протащил её через полсела. Это первый уровень проверки; второй — сервер,
 * третий — CHECK в БД.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { clampPointToRadius, distanceMeters, type LatLng } from '../../../shared/lib/geo'
import { MAX_LOCATION_ADJUST_M } from '../../../shared/types/report-contract'
import {
  GeoError,
  geolocationAvailability,
  pickBetterFix,
  refineFix,
  requestFix,
  type GeoErrorCode,
  type GeoFix,
} from '../lib/geolocation'

export type GeoStatus = 'locating' | 'ready' | 'denied' | 'failed'

export type GeolocationState = {
  status: GeoStatus
  /** Последний GPS-фикс — не меняется при перетаскивании пина. */
  gps: GeoFix | null
  /** Точка для отправки: GPS или поставленная вручную. */
  point: LatLng | null
  manual: boolean
  /** true — последнее перетаскивание упёрлось в радиус 300 м. */
  clamped: boolean
  code: GeoErrorCode | null
}

const INITIAL: GeolocationState = {
  status: 'locating',
  gps: null,
  point: null,
  manual: false,
  clamped: false,
  code: null,
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>(INITIAL)
  const [refining, setRefining] = useState(false)
  const runIdRef = useRef(0)

  const locate = useCallback(async () => {
    runIdRef.current += 1
    const runId = runIdRef.current
    setState(INITIAL)
    setRefining(false)

    try {
      const fix = await requestFix()
      if (runId !== runIdRef.current) return
      setState({ status: 'ready', gps: fix, point: fix, manual: false, clamped: false, code: null })

      setRefining(true)
      try {
        const better = await refineFix()
        if (runId !== runIdRef.current) return
        setState((prev) => {
          if (prev.status !== 'ready' || prev.manual || !prev.gps) return prev
          const best = pickBetterFix(prev.gps, better)
          return { ...prev, gps: best, point: best }
        })
      } catch {
        // Уточнение необязательно: первый фикс уже есть.
      } finally {
        if (runId === runIdRef.current) setRefining(false)
      }
    } catch (error) {
      if (runId !== runIdRef.current) return
      const code: GeoErrorCode =
        error instanceof GeoError ? error.code : 'POSITION_UNAVAILABLE'
      setRefining(false)
      setState({
        status: code === 'PERMISSION_DENIED' ? 'denied' : 'failed',
        gps: null,
        point: null,
        manual: false,
        clamped: false,
        code,
      })
    }
  }, [])

  useEffect(() => {
    void locate()
  }, [locate])

  /**
   * Ручная установка/перетаскивание пина. Без GPS (разрешение запрещено) точку
   * ставим как есть — сравнивать не с чем; с GPS держим в радиусе 300 м.
   */
  const setManualPoint = useCallback((point: LatLng) => {
    setState((prev) => {
      const next = prev.gps ? clampPointToRadius(prev.gps, point, MAX_LOCATION_ADJUST_M) : point
      const clamped = prev.gps !== null && distanceMeters(next, point) > 0.5
      return { ...prev, status: 'ready', point: next, manual: true, clamped }
    })
  }, [])

  return {
    state,
    refining,
    locate,
    setManualPoint,
    availability: geolocationAvailability(),
  }
}