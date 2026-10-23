import { useTranslation } from 'react-i18next'
import { Droplets, X } from 'lucide-react'
import { cx } from '../../../shared/lib/cx'

type WaterBasementFieldProps = {
  value: boolean | null
  onChange: (value: boolean) => void
}

/**
 * Обязательный вопрос формы: вода в подвале сейчас?
 * Два крупных варианта вместо чекбокса — на улице попасть пальцем проще.
 */
export function WaterBasementField({ value, onChange }: WaterBasementFieldProps) {
  const { t } = useTranslation()

  const options = [
    { value: true, label: t('report.basement.yes'), icon: Droplets },
    { value: false, label: t('report.basement.no'), icon: X },
  ] as const

  return (
    <fieldset className="space-y-2">
      <legend className="text-base font-bold text-ink">{t('report.basement.question')}</legend>
      <p className="text-sm text-muted-foreground">{t('report.basement.hint')}</p>
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const selected = value === option.value
          const Icon = option.icon
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cx(
                'flex min-h-16 flex-col items-start gap-1.5 rounded-2xl border-2 p-4 text-left transition-colors active:scale-[0.99]',
                selected
                  ? 'border-ink bg-ink text-on-ink'
                  : 'border-border bg-card text-ink hover:bg-soft',
              )}
            >
              <Icon aria-hidden className="size-5" strokeWidth={2.25} />
              <span className="text-sm leading-snug font-semibold">{option.label}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}