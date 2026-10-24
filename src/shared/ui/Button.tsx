import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'

export type ButtonVariant = 'primary' | 'ink' | 'outline' | 'ghost'
export type ButtonSize = 'md' | 'lg' | 'icon'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-2xl text-center font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60'

const SIZES: Record<ButtonSize, string> = {
  // ≥ 48 px — кнопки должны нажиматься на улице
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-4 text-base',
  // Кнопка-иконка: без горизонтальных отступов, чтобы иконка не сжималась.
  icon: 'size-14 p-0',
}

const VARIANTS: Record<ButtonVariant, string> = {
  // Главное действие экрана — лайм с «чернильным» текстом (макет)
  primary: 'bg-lime text-on-lime hover:bg-lime-strong',
  ink: 'bg-ink text-on-ink hover:bg-ink-strong',
  outline: 'border border-ink/15 bg-card text-ink hover:bg-soft',
  ghost: 'bg-transparent text-brand hover:bg-brand-soft',
}

function buttonClasses(variant: ButtonVariant, size: ButtonSize, className?: string): string {
  return cx(BASE, SIZES[size], VARIANTS[variant], className)
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({
  variant = 'primary',
  size = 'lg',
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />
}

export type ButtonLinkProps = {
  to: string
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  /** Подпись, если внутри только иконка. */
  ariaLabel?: string
  /** Контекст перехода (react-router): например, фото, приложенное к заявке. */
  state?: unknown
}

export function ButtonLink({
  to,
  children,
  variant = 'primary',
  size = 'lg',
  className,
  ariaLabel,
  state,
}: ButtonLinkProps) {
  return (
    <Link to={to} state={state} aria-label={ariaLabel} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  )
}