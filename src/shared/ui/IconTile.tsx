import type { LucideIcon } from 'lucide-react'
import { cx } from '../lib/cx'

type IconTileProps = {
  icon: LucideIcon
  className?: string
}

/** Голубой квадрат с иконкой — плитки главной и списки действий. */
export function IconTile({ icon: Icon, className }: IconTileProps) {
  return (
    <span
      className={cx(
        'grid size-12 shrink-0 place-items-center rounded-tile bg-soft text-brand',
        className,
      )}
    >
      <Icon aria-hidden className="size-6" strokeWidth={2} />
    </span>
  )
}