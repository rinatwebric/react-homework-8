import { ScanLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DEMO_REPORT } from '../../config/demo'
import { Banner } from '../../shared/ui/Banner'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { DemoTag } from '../../shared/ui/DemoTag'
import { RiskBadge } from '../../shared/ui/RiskBadge'
import { ScreenHeader } from '../../shared/ui/ScreenHeader'

// Срез 1: камера → сжатие → AI-оценка → отправка отчёта.
// Сейчас — экран результата на демо-данных: показываем, как будет выглядеть ответ.
export function ScanPage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      <ScreenHeader title={t('scan.title')} />

      <div
        className="relative aspect-4/3 overflow-hidden rounded-card bg-soft"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, rgb(23 69 122 / 0.07) 0 14px, transparent 14px 28px)',
        }}
      >
        <span className="absolute top-4 left-4 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-on-ink">
          {t('scan.photoTag')}
        </span>
        <DemoTag className="absolute top-4 right-4" />
        <span className="absolute bottom-6 left-8 h-24 w-32 rounded-xl border-[3px] border-dashed border-risk-high-fill" />
        <span className="absolute top-16 right-10 h-16 w-24 rounded-xl border-[3px] border-dashed border-risk-elevated-fill" />
      </div>

      <Card className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-ink">{t('scan.resultTitle')}</h2>
          <RiskBadge level={DEMO_REPORT.level} className="px-2.5 py-1 text-xs" />
        </div>
        <p className="text-[15px] leading-snug text-muted-foreground">{t('scan.resultText')}</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-bold text-ink">{t('scan.howTo')}</h2>
        <ol className="space-y-3">
          {DEMO_REPORT.steps.map((stepKey, index) => (
            <li key={stepKey} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-ink">
                {index + 1}
              </span>
              <p className="text-[15px] leading-snug text-ink">{t(stepKey)}</p>
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex gap-3">
        <ButtonLink to="/map" className="flex-1">
          {t('scan.ctaSend')}
        </ButtonLink>
        <ButtonLink
          to="/scan"
          variant="outline"
          size="icon"
          ariaLabel={t('scan.ctaRescan')}
          className="shrink-0"
        >
          <ScanLine aria-hidden className="size-6" strokeWidth={2} />
        </ButtonLink>
      </div>

      <Banner tone="info">{t('scan.demoNote')}</Banner>
    </div>
  )
}