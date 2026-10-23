import { useTranslation } from 'react-i18next'
import { RISK_LEVELS, type RiskLevel } from '../../config/risk'
import { cx } from '../lib/cx'
import { RISK_ORDER } from '../lib/risk'

const FILLS: Record<RiskLevel, string> = {
  normal: 'bg-risk-normal-fill',
  elevated: 'bg-risk-elevated-fill',
  high: 'bg-risk-high-fill',
  critical: 'bg-risk-critical-fill',
}

type RiskScaleProps = {
  level: RiskLevel
  className?: string
}

/**
 * Шкала из четырёх сегментов: заполнены уровни до текущего включительно.
 * Дубль смысла для тех, кто не различает цвета: подпись уровня рядом на экране.
 */
export function RiskScale({ level, className }: RiskScaleProps) {
  const { t } = useTranslation()
  const current = RISK_ORDER[level]

  return (
    <div
      role="img"
      aria-label={t('risk.scaleLabel', { level: t(`risk.${level}`) })}
      className={cx('flex gap-1.5', className)}
    >
      {RISK_LEVELS.map((segment, index) => (
        <span
          key={segment}
          className={cx(
            'h-2.5 flex-1 rounded-full transition-colors',
            index <= current ? FILLS[segment] : 'bg-on-ink/25',
          )}
        />
      ))}
    </div>
  )
}