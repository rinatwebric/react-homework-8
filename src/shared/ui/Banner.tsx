import { Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

type BannerTone = 'info' | 'warning'

type BannerProps = {
  tone?: BannerTone
  title?: string
  children: ReactNode
  className?: string
}

const TONES: Record<BannerTone, { box: string; icon: typeof Info }> = {
  info: { box: 'border-border bg-brand-soft text-brand-strong', icon: Info },
  // Внимание, не связанное с уровнем риска. Жёлтый/оранжевый/красный
  // зарезервированы за шкалой риска, поэтому здесь нейтральная поверхность.
  warning: { box: 'border-border bg-muted text-foreground', icon: TriangleAlert },
}

export function Banner({ tone = 'info', title, children, className }: BannerProps) {
  const { box, icon: Icon } = TONES[tone]

  return (
    <div
      role={tone === 'warning' ? 'alert' : 'note'}
      className={cx('flex gap-3 rounded-card border p-4 text-sm', box, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={2.25} />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  )
}