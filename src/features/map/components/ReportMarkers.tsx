import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { REPORT_CATEGORIES, type ReportCategory } from '../../../shared/lib/categories'
import { createClusterIcon, createReportIcon } from '../lib/report-icon'
import type { MapReport } from '../lib/report-row'
import { ReportPopup } from './ReportPopup'

/**
 * Иконки создаём один раз: Leaflet держит DOM-узел на каждый divIcon, а метки
 * перерисовываются при каждом изменении фильтров.
 */
const REPORT_ICONS: Record<string, ReturnType<typeof createReportIcon>> = {}

for (const cat of REPORT_CATEGORIES) {
  REPORT_ICONS[`${cat}:normal`] = createReportIcon(cat, false)
  REPORT_ICONS[`${cat}:danger`] = createReportIcon(cat, true)
}
REPORT_ICONS['none:normal'] = createReportIcon(null, false)
REPORT_ICONS['none:danger'] = createReportIcon(null, true)

function getIcon(category: ReportCategory | null, danger: boolean) {
  const key = `${category ?? 'none'}:${danger ? 'danger' : 'normal'}`
  return REPORT_ICONS[key] ?? createReportIcon(category, danger)
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
          icon={getIcon(report.category_user, report.immediate_danger)}
        >
          <Popup minWidth={220} maxWidth={280}>
            <ReportPopup report={report} />
          </Popup>
        </Marker>
      ))}
    </MarkerClusterGroup>
  )
}
