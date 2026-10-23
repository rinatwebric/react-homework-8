import { FlaskConical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'

/** Пометка демонстрационных данных: симуляция и демо всегда подписаны. */
export function DemoTag({ className }: { className?: string }) {
  const { t } = useTranslation()

  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground',
        className,
      )}
    >
      <FlaskConical aria-hidden className="size-3.5" strokeWidth={2.25} />
      {t('demo.label')}
    </span>
  )
}