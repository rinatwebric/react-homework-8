import { Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'

type EmptyStateProps = {
  title?: string
  message?: string
  className?: string
}

export function EmptyState({ title, message, className }: EmptyStateProps) {
  const { t } = useTranslation()

  return (
    <div className={cx('flex flex-col items-center gap-2 py-10 text-center', className)}>
      <Inbox aria-hidden className="size-8 text-muted-foreground" />
      <p className="text-lg font-semibold">{title ?? t('states.emptyTitle')}</p>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  )
}