import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_META, REPORT_CATEGORIES, type ReportCategory } from '../../../shared/lib/categories'
import { cx } from '../../../shared/lib/cx'

type CategoryPickerProps = {
  value: ReportCategory | null
  onChange: (category: ReportCategory) => void
}

/**
 * Категория заявки — смысловое поле формы (§7).
 * Кнопки с крупными иконками и цветовой индикацией для наглядного выбора вида проблемы.
 */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { t } = useTranslation()

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">
            {t('report.category.title', 'Вид проблемы / подтопления')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t('report.category.hint', 'Выберите, что именно произошло у вас дома или на улице')}
          </p>
        </div>
        {value && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Check className="size-3" /> Выбрано
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2.5" role="group" aria-label={t('report.category.title')}>
        {REPORT_CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category]
          const Icon = meta.icon
          const active = value === category

          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(category)}
              className={cx(
                'relative flex min-h-[4.5rem] flex-col justify-between rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                active
                  ? cx(meta.chip, 'shadow-sm ring-1 ring-black/5')
                  : 'border-border/80 bg-card text-foreground hover:border-brand/40 hover:bg-muted/30 shadow-xs',
                category === 'other' && 'col-span-2 flex-row items-center min-h-[3.5rem]',
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div
                  className={cx(
                    'flex size-8 items-center justify-center rounded-xl transition-colors',
                    active ? 'bg-white/80 dark:bg-black/20' : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Icon aria-hidden className="size-4.5" strokeWidth={2.25} />
                </div>
                {active && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-current text-white">
                    <Check className="size-3 stroke-[3] text-white" />
                  </span>
                )}
              </div>
              <span className={cx('font-semibold leading-tight text-xs sm:text-sm mt-1.5', active && 'font-bold')}>
                {t(`report.categories.${category}`)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
