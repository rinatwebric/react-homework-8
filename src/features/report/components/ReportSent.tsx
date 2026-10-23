import { CheckCircle2, Home, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../../../shared/ui/Button'
import { Card } from '../../../shared/ui/Card'

type ReportSentProps = {
  reportId: string
  /** true — такой отчёт уже был отправлен ранее (повторное нажатие). */
  duplicate: boolean
}

/** Экран после успешной отправки: видно, что отчёт в системе, и куда идти дальше. */
export function ReportSent({ reportId, duplicate }: ReportSentProps) {
  const { t } = useTranslation()
  const shortId = reportId.slice(0, 8).toUpperCase()

  return (
    <div className="space-y-4">
      <Card className="space-y-3 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-ink">
          <CheckCircle2 aria-hidden className="size-8 text-lime" strokeWidth={2.25} />
        </span>
        <h2 className="text-lg font-bold text-ink">{t('report.sent.title')}</h2>
        <p className="text-[15px] leading-snug text-muted-foreground">{t('report.sent.text')}</p>
        <p className="text-sm text-muted-foreground">
          {t('report.sent.idLabel')}: <span className="font-semibold text-ink">{shortId}</span>
        </p>
        {duplicate ? (
          <p className="rounded-xl bg-muted px-3 py-2 text-sm text-muted-foreground">
            {t('report.sent.duplicate')}
          </p>
        ) : null}
      </Card>

      <ButtonLink to="/map" className="w-full">
        <MapPin aria-hidden className="size-5" strokeWidth={2.25} />
        {t('report.sent.ctaMap')}
      </ButtonLink>
      <ButtonLink to="/" variant="outline" className="w-full">
        <Home aria-hidden className="size-5" strokeWidth={2.25} />
        {t('report.sent.ctaHome')}
      </ButtonLink>
    </div>
  )
}