import { PhoneCall } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../lib/cx'

interface EmergencyCallButtonProps {
  className?: string
  compact?: boolean
}

/**
 * Кнопка экстренного вызова 112 (§11, ТЗ v2.0).
 *
 * Размещается на главном экране и на экране отправки заявки.
 * SuuTech не заменяет 112: при угрозе жизни, быстром подъеме воды
 * или повреждении электросетей житель должен немедленно звонить.
 */
export function EmergencyCallButton({ className, compact = false }: EmergencyCallButtonProps) {
  const { t } = useTranslation()

  if (compact) {
    return (
      <a
        href="tel:112"
        className={cx(
          'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-risk-critical px-4 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.98]',
          className,
        )}
      >
        <PhoneCall aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
        <span>{t('emergency.call')}</span>
      </a>
    )
  }

  return (
    <div
      className={cx(
        'rounded-card border-2 border-risk-critical/30 bg-risk-critical-surface p-4 text-ink shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-bold text-risk-critical flex items-center gap-1.5">
            <PhoneCall aria-hidden className="size-4" strokeWidth={2.5} />
            {t('emergency.title')}
          </p>
          <p className="text-xs leading-snug text-muted-foreground">
            {t('emergency.guidance')}
          </p>
        </div>

        <a
          href="tel:112"
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-risk-critical px-5 py-3 text-sm font-extrabold text-white transition active:scale-95 shadow"
        >
          <PhoneCall aria-hidden className="size-5 shrink-0" strokeWidth={2.5} />
          <span>{t('emergency.call')}</span>
        </a>
      </div>
    </div>
  )
}
