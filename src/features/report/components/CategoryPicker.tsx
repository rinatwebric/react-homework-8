import { useTranslation } from 'react-i18next'
import { CATEGORY_META, REPORT_CATEGORIES, type ReportCategory } from '../../../shared/lib/categories'
import { cx } from '../../../shared/lib/cx'

type CategoryPickerProps = {
  value: ReportCategory | null
  onChange: (category: ReportCategory) => void
}

/**
 * Категория заявки — смысловое поле формы (§7).
 * Чистый, интуитивный выбор вида проблемы без визуального мусора.
 */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { t } = useTranslation()

  return (
    <section className="space-y-2.5">
      <div>
        <h2 className="text-base font-bold text-ink">
          {t('report.category.title', 'Вид проблемы / подтопления')}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('report.category.hint', 'Выберите, что именно произошло у вас дома или на улице')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5" role="group" aria-label={t('report.category.title')}>
        {REPORT_CATEGORIES.map((category) => {
          const meta = CATEGORY_META[category]
          const Icon = meta.icon
          const active = value === category
          const isOther = category === 'other'

          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(category)}
              className={cx(
                'relative flex rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.98]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                isOther
                  ? 'col-span-2 flex-row items-center gap-3 min-h-[3.75rem]'
                  : 'min-h-[5rem] flex-col justify-between',
                active
                  ? cx(meta.chip, 'shadow-xs ring-2 ring-current font-bold')
                  : 'border-border/80 bg-card text-foreground hover:border-brand/40 hover:bg-muted/30 shadow-xs',
              )}
            >
              {isOther ? (
                <>
                  <div
                    className={cx(
                      'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                      active ? 'bg-white text-current shadow-xs' : 'bg-muted/70 text-foreground',
                    )}
                  >
                    <Icon aria-hidden className="size-5" strokeWidth={2.25} />
                  </div>
                  <span className={cx('flex-1 font-semibold text-sm leading-tight', active && 'font-bold')}>
                    {t(`report.categories.${category}`)}
                  </span>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-start w-full">
                    <div
                      className={cx(
                        'flex size-9 items-center justify-center rounded-xl transition-colors',
                        active ? 'bg-white text-current shadow-xs' : 'bg-muted/70 text-foreground',
                      )}
                    >
                      <Icon aria-hidden className="size-5" strokeWidth={2.25} />
                    </div>
                  </div>
                  <span className={cx('font-semibold leading-snug text-xs sm:text-sm mt-2', active && 'font-bold')}>
                    {t(`report.categories.${category}`)}
                  </span>
                </>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
