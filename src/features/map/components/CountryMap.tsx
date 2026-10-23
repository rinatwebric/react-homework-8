import 'leaflet/dist/leaflet.css'
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
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
 * Leaflet запоминает размер контейнера в момент создания карты. Наша карта получает
 * высоту от flex-раскладки и `min-h` уже после первого рендера, поэтому Leaflet
 * считал размер 0×0 и не рисовал ни тайлы, ни зоны (`svg height="0"`, `path d="M0 0"`).
 * Поэтому: явный `absolute inset-0` у контейнера + `invalidateSize` на каждый ресайз.
 */
function MapSizeWatcher() {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const invalidate = () => map.invalidateSize()

    invalidate()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(invalidate)
    observer.observe(container)
    return () => observer.disconnect()
  }, [map])

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
        bounds={MAP_VIEW.bounds}
        boundsOptions={{ padding: [10, 10] }}
        center={MAP_VIEW.center}
        zoom={MAP_VIEW.zoom}
        minZoom={MAP_VIEW.minZoom}
        maxZoom={MAP_VIEW.maxZoom}
        scrollWheelZoom
        className="absolute inset-0"
      >
        <MapSizeWatcher />
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