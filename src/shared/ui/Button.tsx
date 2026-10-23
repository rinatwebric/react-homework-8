import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost'
export type ButtonSize = 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-xl text-center font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60'

const SIZES: Record<ButtonSize, string> = {
  // ≥ 48 px — кнопки должны нажиматься на улице
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-5 text-lg',
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-on-brand hover:bg-brand-strong',
  secondary: 'border border-border bg-card text-brand hover:bg-brand-soft',
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
}

export function ButtonLink({
  to,
  children,
  variant = 'primary',
  size = 'lg',
  className,
}: ButtonLinkProps) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  )
}