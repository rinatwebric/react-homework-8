/**
 * Уровни риска зон из `zone_risk` (публичное чтение). В срезе 2 таблица пустая —
 * это честное «нет данных», карта рисует зоны серыми.
 */
import { useCallback } from 'react'
import type { RiskLevel } from '../../../config/risk'
import { restGet } from '../../../shared/lib/rest'
import { useAsyncData, type AsyncState } from '../../../shared/lib/use-async-data'
import { ZONE_RISK_SELECT, toZoneRiskMap } from '../lib/zone-risk'

export function useZoneRisk(): AsyncState<Map<string, RiskLevel>> {
  const load = useCallback(
    async (signal: AbortSignal) =>
      toZoneRiskMap(await restGet('zone_risk', { select: ZONE_RISK_SELECT, order: 'zone_id' }, signal)),
    [],
  )

  return useAsyncData(load)
}