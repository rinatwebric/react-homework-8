import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'

/** Срез 1: камера → сжатие → AI-оценка → отправка отчёта. */
export function ScanPage() {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{t('scan.title')}</h1>
      <Card>
        <p className="text-muted-foreground">{t('scan.planned')}</p>
      </Card>
      <ButtonLink to="/" variant="secondary">
        {t('states.home')}
      </ButtonLink>
    </section>
  )
}