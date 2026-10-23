import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Circle, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { PILOT_ZONE } from '../../../config/pilot'
import { cx } from '../../../shared/lib/cx'
import type { LatLng } from '../../../shared/lib/geo'
import { createPinIcon } from '../../../shared/lib/leaflet-icons'

const pinIcon = createPinIcon()

/** Перелёт к новому GPS-фиксу: только когда меняется именно GPS, не ручной пин. */
function FlyToFix({ point, zoom }: { point: LatLng; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.flyTo([point.lat, point.lng], zoom, { duration: 0.6 })
  }, [map, point.lat, point.lng, zoom])

  return null
}

type LocationPickerProps = {
  point: LatLng
  /** GPS-фикс: по нему рисуем круг точности и перелетаем. */
  gps: LatLng | null
  accuracyM: number | null
  onMove: (point: LatLng) => void
  className?: string
}

/**
 * Мини-карта отчёта: пин можно перетащить пальцем, круг показывает точность GPS.
 * Leaflet подключён только в чанке /report — на главной его нет.
 */
export function LocationPicker({ point, gps, accuracyM, onMove, className }: LocationPickerProps) {
  const { t } = useTranslation()

  return (
    <div className={cx('space-y-1.5', className)}>
      <div className="relative z-0 overflow-hidden rounded-card">
        <MapContainer
          center={[point.lat, point.lng]}
          zoom={16}
          scrollWheelZoom
          className="h-64 w-full"
          attributionControl
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            maxZoom={19}
          />
          {gps ? <FlyToFix point={gps} zoom={16.5} /> : null}
          {gps && accuracyM !== null ? (
            <Circle
              center={[gps.lat, gps.lng]}
              radius={Math.max(5, accuracyM)}
              pathOptions={{ color: '#17457a', weight: 1, fillColor: '#17457a', fillOpacity: 0.12 }}
            />
          ) : null}
          <Marker
            position={[point.lat, point.lng]}
            icon={pinIcon}
            draggable
            eventHandlers={{
              dragend: (event) => {
                const latlng = event.target.getLatLng()
                onMove({ lat: latlng.lat, lng: latlng.lng })
              },
            }}
          />
        </MapContainer>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">
        {t('report.mapHint', { village: PILOT_ZONE.nameRu })}
      </p>
    </div>
  )
}