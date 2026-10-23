import { Suspense, type ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { HomePage } from '../features/home/HomePage'
import { ScanPage } from '../features/scanner/ScanPage'
import { RouteErrorElement } from './ErrorBoundary'
import { AdminPage, MapPage } from './lazyRoutes'
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
      { path: 'scan', element: <ScanPage /> },
      { path: 'map', element: withSuspense(<MapPage />) },
      { path: 'admin', element: withSuspense(<AdminPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])