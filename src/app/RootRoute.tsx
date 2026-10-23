import { useLocation } from 'react-router-dom'
import { AppErrorBoundary } from './ErrorBoundary'
import { Layout } from './Layout'

/** Корневой маршрут: layout внутри error boundary, key сбрасывает ошибку при переходе. */
export function RootRoute() {
  const location = useLocation()

  return (
    <AppErrorBoundary key={location.pathname}>
      <Layout />
    </AppErrorBoundary>
  )
}