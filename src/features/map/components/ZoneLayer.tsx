import type { Feature, Geometry } from 'geojson'
import type { Path } from 'leaflet'
import { GeoJSON } from 'react-leaflet'
import type { RiskLevel } from '../../../config/risk'
import { zoneIdOf, zoneNameOf, type ZoneFeature } from '../lib/zone-geojson'
import { zoneStyle } from '../lib/zone-style'

export type ZoneSelection = {
  id: string
  name: string
  level: RiskLevel | null
}

type ZoneLayerProps = {
  zones: ZoneFeature[]
  /** Уровни из zone_risk: чего нет в таблице — серое «нет данных». */
  levels: Map<string, RiskLevel>
  selectedId: string | null
  onSelect: (zone: ZoneSelection) => void
}

/**
 * Контуры зон: по одному `<GeoJSON>` на зону — так у каждой свой стиль и клик,
 * и не нужен общий слой с ручным перекрашиванием. `key` включает уровень и выбор,
 * иначе Leaflet не перерисует стиль.
 */
export function ZoneLayer({ zones, levels, selectedId, onSelect }: ZoneLayerProps) {
  return (
    <>
      {zones.map((zone) => {
        const id = zoneIdOf(zone)
        const level = levels.get(id) ?? null
        const selected = selectedId === id

        return (
          <GeoJSON
            key={`${id}:${level ?? 'none'}:${selected ? 'selected' : 'idle'}`}
            data={zone as unknown as Feature<Geometry>}
            style={() => zoneStyle(level, selected)}
            eventHandlers={{
              click: (event) => {
                // Клик по зоне поднимает её над соседями: границы перекрываются.
                ;(event.target as Path).bringToFront()
                onSelect({ id, name: zoneNameOf(zone), level })
              },
            }}
          />
        )
      })}
    </>
  )
}