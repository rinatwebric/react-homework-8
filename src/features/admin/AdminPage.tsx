import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'

/** Срез 3: вход модератора (Supabase Auth), очередь отчётов, действия служб. */
export default function AdminPage() {
  const { t } = useTranslation()

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{t('admin.title')}</h1>
      <Card>
        <p className="text-muted-foreground">{t('admin.planned')}</p>
      </Card>
      <ButtonLink to="/" variant="secondary">
        {t('states.home')}
      </ButtonLink>
    </section>
  )
}