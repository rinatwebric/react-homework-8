import { lazy } from 'react'

// Тяжёлые маршруты — отдельными чанками (Leaflet + GeoJSON не должны грузиться на главной).
export const MapPage = lazy(() => import('../features/map/MapPage'))
export const AdminPage = lazy(() => import('../features/admin/AdminPage'))