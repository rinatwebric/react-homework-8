import type { ResidentRiskLevel } from '../../../config/risk'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { createClusterIcon, createReportIcon } from '../lib/report-icon'
import type { MapReport } from '../lib/report-row'
import { ReportPopup } from './ReportPopup'

/**
 * Иконки создаём один раз: Leaflet держит DOM-узел на каждый divIcon, а метки
 * перерисовываются при каждом изменении фильтров.
 */
const REPORT_ICONS: Record<ResidentRiskLevel | 'none', ReturnType<typeof createReportIcon>> = {
  low: createReportIcon('low'),
  medium: createReportIcon('medium'),
  high: createReportIcon('high'),
  none: createReportIcon(null),
}

/**
 * Метки отчётов в кластерах: на масштабе страны одиночные пины сливаются в кашу,
 * а кластер даёт число. До 500 меток — без виртуализации, кластеризатор справляется.
 */
export function ReportMarkers({ reports }: { reports: MapReport[] }) {
  return (
    <MarkerClusterGroup
      chunkedLoading
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      maxClusterRadius={60}
      iconCreateFunction={(cluster) => createClusterIcon(cluster.getChildCount())}
    >
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.lat_public, report.lng_public]}
          icon={REPORT_ICONS[report.risk_level ?? 'none']}
        >
          <Popup minWidth={200} maxWidth={260}>
            <ReportPopup report={report} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}