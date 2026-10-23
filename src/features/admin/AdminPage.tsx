import { FileText, Inbox, MapPin, Radio, Waves } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DEMO_ADMIN } from '../../config/demo'
import { cx } from '../../shared/lib/cx'
import { Banner } from '../../shared/ui/Banner'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { DemoTag } from '../../shared/ui/DemoTag'
import { RiskBadge } from '../../shared/ui/RiskBadge'
import { MapPreview } from '../map/MapPreview'

const NAV = [
  { id: 'map', icon: MapPin },
  { id: 'reports', icon: Inbox },
  { id: 'sensors', icon: Radio },
  { id: 'drains', icon: Waves },
  { id: 'export', icon: FileText },
] as const

/**
 * Срез 4: вход модератора (Supabase Auth), очередь отчётов, действия служб.
 * Пока — десктопная оболочка панели на демо-данных (макет 5): сайдбар + сводка + карта.
 */
export default function AdminPage() {
  const { t } = useTranslation()
  const [exportNote, setExportNote] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-ink text-on-ink md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:py-6">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 md:px-6 md:pt-0">
          <Link to="/" className="text-xl font-extrabold tracking-tight">
            SuuTech
          </Link>
          <Link to="/" className="text-xs font-medium text-on-ink/70 md:hidden">
            {t('states.home')}
          </Link>
        </div>

        <nav
          aria-label={t('admin.navLabel')}
          className="mt-3 flex gap-1 overflow-x-auto px-3 pb-3 md:mt-8 md:flex-col md:gap-1.5 md:overflow-visible md:px-3 md:pb-0"
        >
          {NAV.map(({ id, icon: Icon }, index) => (
            <span
              key={id}
              title={t('admin.demoNote')}
              className={cx(
                'flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium',
                index === 0 ? 'bg-brand-bright text-white' : 'text-on-ink/75',
              )}
            >
              <Icon aria-hidden className="size-4" strokeWidth={2} />
              {t(`admin.nav.${id}`)}
            </span>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl space-y-4">
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{t('admin.kicker')}</p>
              <h1 className="text-2xl leading-tight font-extrabold text-ink md:text-3xl">
                {t('admin.title')}
              </h1>
            </div>
            <DemoTag />
          </header>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {DEMO_ADMIN.stats.map(({ id, value }) => (
              <Card key={id} className="p-4">
                <p className="text-xs leading-snug text-muted-foreground">{t(`admin.stats.${id}`)}</p>
                <p className="mt-1 text-2xl font-extrabold text-ink">{value}</p>
              </Card>
            ))}
          </div>

          {exportNote ? <Banner tone="info">{t('admin.demoNote')}</Banner> : null}

          <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
            <Card className="relative h-72 overflow-hidden p-0 lg:h-auto lg:min-h-80">
              <MapPreview />
            </Card>

            <Card className="space-y-3">
              <h2 className="font-bold text-ink">{t('admin.newReports')}</h2>
              <ul className="divide-y divide-border">
                {DEMO_ADMIN.requests.map(({ id, level }) => (
                  <li key={id} className="flex items-start justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {t(`admin.items.${id}Street`)}
                      </p>
                      <p className="text-xs leading-snug text-muted-foreground">
                        {t(`admin.items.${id}Text`)}
                      </p>
                    </div>
                    <RiskBadge level={level} className="px-2 py-0.5 text-xs" />
                  </li>
                ))}
              </ul>
              <Button
                size="md"
                className="w-full"
                onClick={() => setExportNote((open) => !open)}
              >
                {t('admin.export')}
              </Button>
            </Card>
          </div>

          <p className="text-xs text-muted-foreground">{t('admin.demoNote')}</p>
        </div>
      </main>
    </div>
  )
}