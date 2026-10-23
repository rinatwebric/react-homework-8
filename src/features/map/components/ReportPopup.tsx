import { Droplets, Ruler } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toZoneRisk } from '../../../shared/lib/risk'
import { DemoTag } from '../../../shared/ui/DemoTag'
import { RiskBadge } from '../../../shared/ui/RiskBadge'
import type { MapReport } from '../lib/report-row'

/**
 * Попап метки. Показываем только публичные данные: дата, оценка (если была),
 * вода в подвале, глубина в колодце. Фото и точный адрес не выводим — в
 * `reports_public` координаты округлены, снимки остаются в отчёте.
 */
export function ReportPopup({ report }: { report: MapReport }) {
  const { t, i18n } = useTranslation()

  const date = new Date(report.created_at).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {report.risk_level ? (
          <RiskBadge level={toZoneRisk(report.risk_level)} />
        ) : (
          <span className="inline-flex items-center rounded-full border border-dashed border-muted-foreground px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
            {t('map.popup.noAssessment')}
          </span>
        )}
        {report.is_demo ? <DemoTag /> : null}
      </div>

      <p className="text-xs text-muted-foreground">
        {date} · {t(`map.status.${report.status}`)}
      </p>

      {report.water_in_basement ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-risk-high">
          <Droplets aria-hidden className="size-3.5" />
          {t('map.popup.waterInBasement')}
        </p>
      ) : null}

      {report.well_depth_m !== null ? (
        <p className="flex items-center gap-1.5 text-xs text-foreground">
          <Ruler aria-hidden className="size-3.5" />
          {t('map.popup.wellDepth', { depth: report.well_depth_m })}
        </p>
      ) : null}

      <p className="text-[11px] leading-snug text-muted-foreground">{t('map.popup.approx')}</p>
    </div>
  )
}