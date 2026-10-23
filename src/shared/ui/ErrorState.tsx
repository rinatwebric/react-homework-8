import { CircleAlert, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'
import { Button } from './Button'

type ErrorStateProps = {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({ title, message, onRetry, className }: ErrorStateProps) {
  const { t } = useTranslation()

  return (
    <div
      role="alert"
      className={cx(
        'flex flex-col items-center gap-3 rounded-card border border-border bg-card p-6 text-center',
        className,
      )}
    >
      <CircleAlert aria-hidden className="size-8 text-brand" />
      <div className="space-y-1">
        <p className="text-lg font-semibold">{title ?? t('states.errorTitle')}</p>
        <p className="text-sm text-muted-foreground">{message ?? t('states.errorText')}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="md" onClick={onRetry} className="mt-1">
          <RefreshCw aria-hidden className="size-4" />
          {t('states.retry')}
        </Button>
      ) : null}
    </div>
  )
}