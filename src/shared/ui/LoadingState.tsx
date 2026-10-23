import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'

type LoadingStateProps = {
  label?: string
  className?: string
}

export function LoadingState({ label, className }: LoadingStateProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx('flex flex-col items-center gap-3 py-10 text-muted-foreground', className)}
    >
      <Loader2 aria-hidden className="size-8 animate-spin text-brand" />
      <p className="text-sm">{label ?? t('states.loading')}</p>
    </div>
  )
}