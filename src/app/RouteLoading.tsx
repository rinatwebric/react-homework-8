import { LoadingState } from '../shared/ui/LoadingState'

/** Фолбэк Suspense для ленивых маршрутов (/map, /admin — отдельные чанки). */
export function RouteLoading() {
  return <LoadingState className="py-16" />
}