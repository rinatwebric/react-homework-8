/**
 * Стиль зоны на карте. Цвет — только из шкалы риска (лайм не используем, AGENTS.md);
 * зона без строки в `zone_risk` серая и пунктирная, чтобы «нет данных» не читалось
 * как «норма». Прозрачность подобрана так, чтобы подложка OSM оставалась видимой.
 */
import type { PathOptions } from 'leaflet'
import { MAP_INK_HEX, NO_DATA_FILL_HEX, RISK_FILL_HEX } from '../../../config/map'
import type { RiskLevel } from '../../../config/risk'

export function zoneFillColor(level: RiskLevel | null): string {
  return level ? RISK_FILL_HEX[level] : NO_DATA_FILL_HEX
}

/**
 * `selected` — зона, по которой кликнули: толще и плотнее, остальные приглушены не будут
 * (карта страны и так светлая, лишняя логика приглушения — шум).
 */
export function zoneStyle(level: RiskLevel | null, selected = false): PathOptions {
  return {
    color: MAP_INK_HEX,
    weight: selected ? 3 : 1,
    opacity: selected ? 0.9 : 0.4,
    fillColor: zoneFillColor(level),
    fillOpacity: selected ? 0.6 : level ? 0.3 : 0.18,
    dashArray: level ? undefined : '5 4',
  }
}