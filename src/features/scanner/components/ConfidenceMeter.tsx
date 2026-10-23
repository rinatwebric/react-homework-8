import { cx } from '../../../shared/lib/cx'

type ConfidenceMeterProps = {
  percent: number
  label: string
  className?: string
}

/** Уверенность оценки: число + полоса. Не только цвет — важно для дальтоников. */
export function ConfidenceMeter({ percent, label, className }: ConfidenceMeterProps) {
  return (
    <div className={cx('space-y-1.5', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold text-ink">{percent}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-brand-bright" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}