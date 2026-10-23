import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

type CardProps = {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cx('rounded-card border border-border bg-card p-4 shadow-sm', className)}>
      {children}
    </div>
  )
}