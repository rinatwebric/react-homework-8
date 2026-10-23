import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'

/** Срез 2: карта страны, зоны районов, метки и фильтры. Грузится отдельным чанком. */
export default function MapPage() {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{t('map.title')}</h1>
      <Card>
        <p className="text-muted-foreground">{t('map.planned')}</p>
      </Card>
      <ButtonLink to="/" variant="secondary">
        {t('states.home')}
      </ButtonLink>
    </section>
  )
}