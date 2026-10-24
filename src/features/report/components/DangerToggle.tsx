import { AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../../shared/lib/cx'

type DangerToggleProps = {
  value: boolean
  onChange: (value: boolean) => void
}

/**
 * «Есть непосредственная опасность для жизни» (§7, §11).
 *
 * Это не замена звонку 112: отметка только поднимает заявку в очереди модератора.
 * Поэтому рядом — прямая ссылка `tel:112`, а сам переключатель сделан крупным:
 * в стрессовой ситуации попасть по нему должно быть легко.
 */
export function DangerToggle({ value, onChange }: DangerToggleProps) {
  const { t } = useTranslation()

  return (
    <div
      className={cx(
        'rounded-card border-2 p-3 transition-colors',
        value ? 'border-risk-critical bg-risk-critical-surface' : 'border-border bg-card',
      )}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-risk-critical"
        />
        <span className="space-y-1">
          <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
            <AlertTriangle aria-hidden className="size-4 shrink-0" strokeWidth={2.5} />
            {t('report.danger.label')}
          </span>
          <span className="block text-xs leading-snug text-muted-foreground">
            {t('report.danger.hint')}
          </span>
        </span>
      </label>

      {value ? (
        <a
          href="tel:112"
          className="mt-2 inline-flex min-h-10 items-center rounded-full bg-risk-critical px-4 text-sm font-bold text-white"
        >
          {t('report.danger.call')}
        </a>
      ) : null}
    </div>
  )
}