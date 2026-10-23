/**
 * Визуальные параметры меток и кластеров — без Leaflet, чтобы тестировалось в node
 * (vitest.config.ts: environment 'node').
 */
import { NO_DATA_FILL_HEX, RISK_FILL_HEX } from '../../../config/map'
import type { ResidentRiskLevel } from '../../../config/risk'
import { toZoneRisk } from '../../../shared/lib/risk'

/**
 * Отчёт оценивается по шкале low | medium | high — метка красится цветом своей зоны
 * (toZoneRisk), поэтому карта читается одной шкалой. `critical` по фото не бывает.
 */
export function reportFillColor(level: ResidentRiskLevel | null): string {
  return level ? RISK_FILL_HEX[toZoneRisk(level)] : NO_DATA_FILL_HEX
}

/** Кластер растёт ступенями: число влезает, кружок не дёргается на каждом ререндере. */
export function clusterSize(count: number): number {
  if (count < 10) return 34
  if (count < 100) return 42
  return 50
}

/** Попап отчёта открывается по метке — цвет нужен и для рамки, и для точки в списке. */
export function reportNeedsAttention(level: ResidentRiskLevel | null, waterInBasement: boolean): boolean {
  return waterInBasement || level === 'high'
}