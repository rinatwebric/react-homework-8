import 'leaflet/dist/leaflet.css'
import { useState } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import { MAP_TILES, MAP_VIEW, MAP_ZONES } from '../../../config/map'
import type { RiskLevel } from '../../../config/risk'
import { cx } from '../../../shared/lib/cx'
import type { MapReport } from '../lib/report-row'
import type { ZoneCollection } from '../lib/zone-geojson'
import { ReportMarkers } from './ReportMarkers'
import { ZoneLayer, type ZoneSelection } from './ZoneLayer'

type CountryMapProps = {
  /** Границы областей и районов грузятся отдельно от данных риска. */
  adm1: ZoneCollection | null
  adm2: ZoneCollection | null
  levels: Map<string, RiskLevel>
  reports: MapReport[]
  selectedId: string | null
  onSelectZone: (zone: ZoneSelection) => void
  className?: string
}

/** Зум живёт внутри MapContainer: слушаем событие, чтобы менять уровень детализации. */
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (event) => onZoom(event.target.getZoom()),
  })
  return null
}

/**
 * Карта страны: OSM-тайлы, контуры областей/районов и кластеры отчётов.
 * Масштаб < `districtsFromZoom` — области, глубже — районы: 41 район на всю страну
 * в мелком масштабе превращается в паутину.
 */
export function CountryMap({
  adm1,
  adm2,
  levels,
  reports,
  selectedId,
  onSelectZone,
  className,
}: CountryMapProps) {
  const [zoom, setZoom] = useState(MAP_VIEW.zoom)

  const zones = zoom >= MAP_ZONES.districtsFromZoom ? (adm2?.features ?? []) : (adm1?.features ?? [])

  return (
    <div className={cx('relative isolate z-0 overflow-hidden rounded-card border border-border', className)}>
      <MapContainer
        center={MAP_VIEW.center}
        zoom={MAP_VIEW.zoom}
        minZoom={MAP_VIEW.minZoom}
        maxZoom={MAP_VIEW.maxZoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          url={MAP_TILES.url}
          maxZoom={MAP_TILES.maxZoom}
          attribution={`${MAP_TILES.attribution} · ${MAP_ZONES.attribution}`}
        />
        <ZoomWatcher onZoom={setZoom} />
        <ZoneLayer zones={zones} levels={levels} selectedId={selectedId} onSelect={onSelectZone} />
        <ReportMarkers reports={reports} />
      </MapContainer>
    </div>
  )
}