import { Compass } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../shared/ui/Button'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <Compass aria-hidden className="size-10 text-brand" />
      <h1 className="text-2xl font-bold">{t('notFound.title')}</h1>
      <p className="text-muted-foreground">{t('notFound.text')}</p>
      <ButtonLink to="/">{t('states.home')}</ButtonLink>
    </div>
  )
}