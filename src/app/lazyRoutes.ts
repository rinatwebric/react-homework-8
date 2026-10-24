import { lazy } from 'react'

// Тяжёлые маршруты — отдельными чанками (Leaflet + GeoJSON не должны грузиться на главной).
export const MapPage = lazy(() => import('../features/map/MapPage'))
export const AdminPage = lazy(() => import('../features/admin/AdminPage'))
export const ReportPage = lazy(() =>
  import('../features/report/ReportPage').then((module) => ({ default: module.ReportPage })),
)
export const WaterPage = lazy(() =>
  import('../features/water/WaterPage').then((module) => ({ default: module.WaterPage })),
)
