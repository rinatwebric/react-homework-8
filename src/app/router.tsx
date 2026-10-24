import { Suspense, type ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '../features/home/HomePage'
import { RouteErrorElement } from './ErrorBoundary'
import { AdminPage, MapPage, ReportPage, WaterPage } from './lazyRoutes'
import { NotFoundPage } from './NotFoundPage'
import { RootRoute } from './RootRoute'
import { RouteLoading } from './RouteLoading'

function withSuspense(element: ReactElement): ReactElement {
  return <Suspense fallback={<RouteLoading />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRoute />,
    errorElement: <RouteErrorElement />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'water', element: withSuspense(<WaterPage />) },
      { path: 'report', element: withSuspense(<ReportPage />) },
      { path: 'map', element: withSuspense(<MapPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    // Панель служб живёт вне мобильной оболочки: на десктопе — свой сайдбар.
    path: '/admin',
    element: withSuspense(<AdminPage />),
    errorElement: <RouteErrorElement />,
  },
])
