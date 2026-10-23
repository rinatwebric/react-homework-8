import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

type ScreenHeaderProps = {
  title: string
  backTo?: string
  backLabel?: string
  action?: ReactNode
}

/** Шапка внутреннего экрана: круглая кнопка «назад» + заголовок (макет). */
export function ScreenHeader({ title, backTo = '/', backLabel, action }: ScreenHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3">
      <Link
        to={backTo}
        aria-label={backLabel ?? t('states.back')}
        className="grid size-12 shrink-0 place-items-center rounded-2xl bg-card text-ink shadow-card"
      >
        <ChevronLeft aria-hidden className="size-6" strokeWidth={2.5} />
      </Link>
      <h1 className="min-w-0 flex-1 text-2xl leading-tight font-extrabold text-ink">{title}</h1>
      {action}
    </div>
  )
}