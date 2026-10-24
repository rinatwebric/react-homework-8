import { lazy } from 'react'

// Тяжёлые маршруты — отдельными чанками (Leaflet + GeoJSON не должны грузиться на главной).
export const MapPage = lazy(() => import('../features/map/MapPage'))
export const AdminPage = lazy(() => import('../features/admin/AdminPage'))
// Форма отчёта держит Leaflet (пин на карте) — тоже отдельный чанк.
// ReportPage экспортируется по имени (не default), поэтому разворачиваем модуль в default.
export const ReportPage = lazy(() =>
  import('../features/report/ReportPage').then((module) => ({ default: module.ReportPage })),
)