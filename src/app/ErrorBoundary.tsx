import { CircleAlert } from 'lucide-react'
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button, ButtonLink } from '../shared/ui/Button'

/**
 * Никогда белого экрана: ошибка рендера или маршрута показывает
 * понятный экран с кнопками «Обновить» и «На главную».
 */
type BoundaryProps = {
  children: ReactNode
  fallback: (error: unknown) => ReactNode
}

type BoundaryState = {
  error: unknown
  hasError: boolean
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, hasError: false }

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { error, hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[SuuTech] ошибка рендера:', error, errorInfo.componentStack)
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback(this.state.error) : this.props.children
  }
}

type ScreenProps = {
  title: string
  message: string
}

function ErrorScreen({ title, message }: ScreenProps) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 p-6">
      <CircleAlert aria-hidden className="size-10 text-brand" />
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">{message}</p>
      <div className="flex flex-col gap-3">
        <Button onClick={() => window.location.reload()}>{t('states.reload')}</Button>
        <ButtonLink to="/" variant="outline">
          {t('states.home')}
        </ButtonLink>
      </div>
    </div>
  )
}

/** Ловит ошибки рендера внутри роутера. Пересоздаётся при смене пути (key в router). */
export function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <Boundary
      fallback={() => <ErrorScreen title={t('states.errorTitle')} message={t('states.errorText')} />}
    >
      {children}
    </Boundary>
  )
}

/** Запасной экран для createBrowserRouter (errorElement): ошибка загрузки чанка, 404 и т.п. */
export function RouteErrorElement() {
  const { t } = useTranslation()
  const error = useRouteError()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  useEffect(() => {
    console.error('[SuuTech] ошибка маршрута:', error)
  }, [error])

  return (
    <ErrorScreen
      title={notFound ? t('notFound.title') : t('states.errorTitle')}
      message={notFound ? t('notFound.text') : t('states.errorText')}
    />
  )
}