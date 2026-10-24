import { useTranslation } from 'react-i18next'
import { CATEGORY_META, REPORT_CATEGORIES, type ReportCategory } from '../../../shared/lib/categories'
import { cx } from '../../../shared/lib/cx'

type CategoryPickerProps = {
  value: ReportCategory | null
  onChange: (category: ReportCategory) => void
}

/**
 * Категория заявки — единственное обязательное смысловое поле формы (§7).
 * Кнопки, а не select: на телефоне видно все варианты сразу, а иконка помогает
 * тем, кто читает по-кыргызски хуже. `aria-pressed` = состояние выбора.
 */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { t } = useTranslation()

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-base font-bold text-ink">{t('report.category.title')}</h2>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
          {t('report.category.hint')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label={t('report.category.title')}>
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
                'flex min-h-16 items-center gap-2 rounded-card border-2 px-3 py-2 text-left text-sm font-semibold',
                'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                active ? meta.chip : 'border-border bg-card text-foreground hover:bg-muted',
                // Последняя категория одна в ряду — растягиваем на всю ширину.
                category === 'other' && 'col-span-2',
              )}
            >
              <Icon aria-hidden className="size-5 shrink-0" strokeWidth={2.25} />
              <span className="leading-snug">{t(`report.categories.${category}`)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}