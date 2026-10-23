import { Camera, History, ListChecks, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ReportContext } from '../../../shared/types/report-context'
import { photoPathClientId } from '../../../shared/types/report-contract'
import { Banner } from '../../../shared/ui/Banner'
import { Button, ButtonLink } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'
import { RiskBadge } from '../../../shared/ui/RiskBadge'
import { RiskScale } from '../../../shared/ui/RiskScale'
import type { AnalyzeResult } from '../lib/analyze-photo'
import { buildAssessmentView } from '../lib/assessment-view'
import { ConfidenceMeter } from './ConfidenceMeter'

type AssessmentResultProps = {
  result: AnalyzeResult
  /** Тот же client_id, с которым фото ушло в analyze-photo: путь фото проверяется на сервере. */
  clientId: string
  onRescan: () => void
}

/**
 * Результат AI-оценки: риск цветом + иконкой + текстом, уверенность,
 * находки, действия и дисклеймер. Нерелевантное фото и низкая уверенность
 * показываются отдельными подсказками, а не «приговором».
 *
 * Главное действие — «Сообщить о воде»: оценка переезжает в отчёт вместе с фото
 * и координатами (срез 2). Оценка сама по себе ничего не отправляет властям.
 */
export function AssessmentResult({ result, clientId, onRescan }: AssessmentResultProps) {
  const { t } = useTranslation()
  const { assessment, cached, photoPath } = result
  const view = buildAssessmentView(assessment)

  // Фото прикладываем, только если оно лежит в папке этого скана:
  // подменённый или чужой путь в отчёт не уедет.
  const ownPhotoPath = photoPath && photoPathClientId(photoPath) === clientId ? photoPath : null

  const reportState: ReportContext = {
    photoPath: ownPhotoPath,
    riskLevel: assessment.risk_level,
    confidence: assessment.confidence,
    findings: assessment.findings,
    recommendations: assessment.recommendations,
  }

  return (
    <div className="space-y-3">
      {view.outcome === 'irrelevant' ? (
        <Banner tone="warning" title={t('scan.irrelevantTitle')}>
          {t('scan.irrelevantText')}
        </Banner>
      ) : null}

      {view.outcome === 'low_confidence' ? (
        <Banner tone="warning" title={t('scan.lowConfidenceTitle')}>
          {t('scan.lowConfidenceText')}
        </Banner>
      ) : null}

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-ink">{t(`scan.headline.${view.headline}`)}</h2>
          <RiskBadge level={view.zoneLevel} />
          {cached ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <History aria-hidden className="size-3.5" strokeWidth={2.5} />
              {t('scan.cached')}
            </span>
          ) : null}
        </div>
        <RiskScale level={view.zoneLevel} />
        <ConfidenceMeter percent={view.confidencePercent} label={t('scan.confidenceLabel')} />
      </Card>

      {assessment.findings.length > 0 ? (
        <Card className="space-y-2">
          <h3 className="flex items-center gap-2 text-base font-bold text-ink">
            <ListChecks aria-hidden className="size-5 text-brand" strokeWidth={2.25} />
            {t('scan.findingsTitle')}
          </h3>
          <ul className="space-y-1.5">
            {assessment.findings.map((finding, index) => (
              <li
                key={`${index}-${finding}`}
                className="flex gap-2 text-[15px] leading-snug text-muted-foreground"
              >
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" />
                {finding}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {assessment.recommendations.length > 0 ? (
        <Card className="space-y-3">
          <h3 className="text-base font-bold text-ink">{t('scan.recommendationsTitle')}</h3>
          <ol className="space-y-2.5">
            {assessment.recommendations.map((recommendation, index) => (
              <li key={`${index}-${recommendation}`} className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-ink">
                  {index + 1}
                </span>
                <p className="text-[15px] leading-snug text-ink">{recommendation}</p>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <Banner tone="info">{assessment.disclaimer}</Banner>

      <div className="flex gap-3">
        <ButtonLink to="/report" state={reportState} className="flex-1">
          <Send aria-hidden className="size-5" strokeWidth={2.25} />
          {t('scan.ctaReport')}
        </ButtonLink>
        <Button
          variant="outline"
          size="icon"
          aria-label={t('scan.rescan')}
          onClick={onRescan}
          className="shrink-0"
        >
          <Camera aria-hidden className="size-6" strokeWidth={2} />
        </Button>
      </div>
      <p className="text-center text-xs leading-snug text-muted-foreground">
        {t('scan.reportHint')}
      </p>
    </div>
  )
}