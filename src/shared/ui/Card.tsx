import type { ReactNode } from 'react'
import { cx } from '../lib/cx'

export type CardTone = 'surface' | 'ink' | 'soft'

const TONES: Record<CardTone, string> = {
  // Белая карточка с мягкой тенью — базовый блок макета
  surface: 'bg-card text-foreground shadow-card',
  // Тёмно-синяя карточка: риск сегодня, статус воды
  ink: 'bg-ink text-on-ink shadow-card',
  // Голубая подложка без тени
  soft: 'bg-soft text-foreground',
}

type CardProps = {
  children: ReactNode
  className?: string
  tone?: CardTone
}

export function Card({ children, className, tone = 'surface' }: CardProps) {
  return <div className={cx('rounded-card p-5', TONES[tone], className)}>{children}</div>
}