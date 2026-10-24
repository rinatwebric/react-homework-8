import { AlertTriangle, CloudRain, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { CATEGORY_META, type ReportCategory } from '../../../shared/lib/categories'
import { cx } from '../../../shared/lib/cx'
import { DemoTag } from '../../../shared/ui/DemoTag'
import type { MapReport } from '../lib/report-row'

/**
 * Попап метки v2.0. Показываем публичные данные заявки:
 * категория (иконка + цвет + текст), опасность, дата, статус, комментарий жителя
 * и погодный снимок на момент отправки.
 * Координаты в `reports_public` округлены до ~100 м, точные видят только службы.
 */
export function ReportPopup({ report }: { report: MapReport }) {
  const { t, i18n } = useTranslation()

  const date = new Date(report.created_at).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const categoryMeta = report.category_user ? CATEGORY_META[report.category_user as ReportCategory] : null
  const CategoryIcon = categoryMeta?.icon ?? HelpCircle
  const categoryLabel = report.category_user
    ? t(`report.categories.${report.category_user}`)
    : t('map.popup.noCategory')

  const weather = report.weather_snapshot
  const temp = weather?.temperature_c ?? weather?.temp_c
  const precip = weather?.precipitation_mm ?? weather?.precip_mm
  const humidity = weather?.humidity_pct ?? weather?.humidity
  const hasWeather = temp !== undefined || precip !== undefined || humidity !== undefined

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className={cx(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            categoryMeta?.chip ?? 'border-border bg-muted text-muted-foreground',
          )}
        >
          <CategoryIcon aria-hidden className="size-3.5" />
          {categoryLabel}
        </span>

        {report.immediate_danger ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-risk-critical/40 bg-risk-critical/10 px-2 py-0.5 text-xs font-semibold text-risk-critical">
            <AlertTriangle aria-hidden className="size-3" />
            {t('map.popup.immediateDanger')}
          </span>
        ) : null}

        {report.is_demo ? <DemoTag /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {date} · {t(`map.status.${report.status}`)}
      </p>

      {report.comment ? (
        <p className="line-clamp-3 border-l-2 border-border pl-2 text-xs italic text-foreground">
          «{report.comment}»
        </p>
      ) : null}

      {hasWeather ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CloudRain aria-hidden className="size-3 shrink-0" />
          <span>
            {temp !== undefined ? `${temp > 0 ? `+${temp}` : temp}°C` : ''}
            {precip !== undefined ? ` · ${precip} мм` : ''}
            {humidity !== undefined ? ` · ${humidity}%` : ''}
          </span>
        </p>
      ) : null}

      <p className="text-[11px] leading-snug text-muted-foreground">{t('map.popup.approx')}</p>
    </div>
  )
}
