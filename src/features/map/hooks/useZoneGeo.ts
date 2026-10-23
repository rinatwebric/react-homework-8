/**
 * Границы зон: статический файл из public/geo, ответ валидируется zod (lib/zone-geojson).
 * ADM1 — области, ADM2 — районы; уровень выбирает компонент по зуму, второй файл
 * не грузится, пока он не нужен.
 */
import { useCallback } from 'react'
import { MAP_ZONES } from '../../../config/map'
import { useAsyncData, type AsyncState } from '../../../shared/lib/use-async-data'
import { parseZoneCollection, type ZoneCollection, type ZoneKind } from '../lib/zone-geojson'

const ZONE_URLS: Record<ZoneKind, string> = {
  ADM1: MAP_ZONES.adm1Url,
  ADM2: MAP_ZONES.adm2Url,
}

export function useZoneGeo(kind: ZoneKind): AsyncState<ZoneCollection> {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const response = await fetch(ZONE_URLS[kind], { signal })
      if (!response.ok) {
        throw new Error(`Границы зон не загрузились (${String(response.status)})`)
      }
      return parseZoneCollection(await response.json(), kind)
    },
    [kind],
  )

  return useAsyncData(load)
}