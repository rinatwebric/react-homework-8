/**
 * Отчёты для публичной карты: только `reports_public` (координаты округлены ~100 м,
 * без `device_hash`), только с координатами, свежие сверху, лимит демо-масштаба.
 * Фильтры (риск/период/статус) применяются на клиенте — данных мало, а зум не должен
 * ждать сети.
 */
import { useCallback } from 'react'
import { MAP_REPORTS_LIMIT } from '../../../config/map'
import { restGet } from '../../../shared/lib/rest'
import { useAsyncData, type AsyncState } from '../../../shared/lib/use-async-data'
import { REPORT_SELECT, parseMapReports, type MapReport } from '../lib/report-row'

export function usePublicReports(): AsyncState<MapReport[]> {
  const load = useCallback(async (signal: AbortSignal) => {
    const raw = await restGet(
      'reports_public',
      {
        select: REPORT_SELECT,
        lat_public: 'not.is.null',
        order: 'created_at.desc',
        limit: String(MAP_REPORTS_LIMIT),
      },
      signal,
    )

    return parseMapReports(raw).reports
  }, [])

  return useAsyncData(load)
}