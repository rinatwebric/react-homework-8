/**
 * Метки отчётов и кластеры. Цвет и размер считает marker-visuals (покрыт тестами),
 * здесь только Leaflet: divIcon с inline-SVG пина из shared/lib/leaflet-icons.
 */
import L from 'leaflet'
import type { ReportCategory } from '../../../shared/lib/categories'
import { createPinIcon } from '../../../shared/lib/leaflet-icons'
import { clusterSize, reportFillColor } from './marker-visuals'

export function createReportIcon(category: ReportCategory | null, danger = false): L.DivIcon {
  return createPinIcon({
    fill: reportFillColor(category),
    stroke: danger ? '#dc2626' : '#123a5c',
  })
}

/** Кластер: «чернильный» круг с числом. Цвет не входит в шкалу риска. */
export function createClusterIcon(count: number): L.DivIcon {
  const size = clusterSize(count)
  const html = `<div class="suutech-cluster" style="width:${size}px;height:${size}px">${count}</div>`

  return L.divIcon({
    html,
    className: 'suutech-cluster-wrap',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}
