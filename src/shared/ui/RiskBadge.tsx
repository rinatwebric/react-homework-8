import { CircleCheck, OctagonAlert, ShieldAlert, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { RiskLevel } from '../../config/risk'
import { cx } from '../lib/cx'

type RiskStyle = {
  badge: string
  icon: typeof CircleCheck
}

// Риск показывается цветом + иконкой + текстом (не только цветом).
const RISK_STYLES: Record<RiskLevel, RiskStyle> = {
  normal: { badge: 'bg-risk-normal-surface text-risk-normal', icon: CircleCheck },
  elevated: { badge: 'bg-risk-elevated-surface text-risk-elevated', icon: TriangleAlert },
  high: { badge: 'bg-risk-high-surface text-risk-high', icon: OctagonAlert },
  critical: { badge: 'bg-risk-critical-surface text-risk-critical', icon: ShieldAlert },
}

type RiskBadgeProps = {
  level: RiskLevel
  className?: string
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const { t } = useTranslation()
  const { badge, icon: Icon } = RISK_STYLES[level]

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
        badge,
        className,
      )}
    >
      <Icon aria-hidden className="size-4" strokeWidth={2.5} />
      {t(`risk.${level}`)}
    </span>
  )
}