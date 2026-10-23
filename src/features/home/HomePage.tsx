import { ArrowRight, Bell, Droplet, MapPin, Plus, ScanLine } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { DEMO_HOME } from '../../config/demo'
import { PILOT_ZONE } from '../../config/pilot'
import { Banner } from '../../shared/ui/Banner'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { DemoTag } from '../../shared/ui/DemoTag'
import { IconTile } from '../../shared/ui/IconTile'
import { RiskScale } from '../../shared/ui/RiskScale'

const TILES = [
  { to: '/scan', icon: ScanLine, titleKey: 'home.tiles.scanTitle', textKey: 'home.tiles.scanText' },
  { to: '/map', icon: MapPin, titleKey: 'home.tiles.mapTitle', textKey: 'home.tiles.mapText' },
  { to: '/water', icon: Droplet, titleKey: 'home.tiles.waterTitle', textKey: 'home.tiles.waterText' },
  { to: '/scan', icon: Plus, titleKey: 'home.tiles.reportTitle', textKey: 'home.tiles.reportText' },
] as const

/** Главная: село, риск на сегодня, плитки разделов и совет (макет 1). */
export function HomePage() {
  const { t } = useTranslation()
  const [alertsOpen, setAlertsOpen] = useState(false)

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t('home.villageLabel')}</p>
          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-ink">
            {PILOT_ZONE.nameRu}
          </h1>
        </div>
        <button
          type="button"
          aria-label={t('home.bellLabel')}
          aria-expanded={alertsOpen}
          onClick={() => setAlertsOpen((open) => !open)}
          className="grid size-14 shrink-0 place-items-center rounded-2xl bg-card text-ink shadow-card"
        >
          <Bell aria-hidden className="size-6" strokeWidth={2} />
        </button>
      </header>

      {alertsOpen ? <Banner tone="info">{t('home.bellNote')}</Banner> : null}

      <Card tone="ink" className="space-y-4 p-6">
        <p className="text-sm font-medium text-on-ink/70">{t('home.riskLabel')}</p>
        <p className="text-4xl font-extrabold tracking-tight">{t(`risk.${DEMO_HOME.level}`)}</p>
        <RiskScale level={DEMO_HOME.level} />
        <p className="text-[15px] leading-snug text-on-ink/85">{t('home.riskAdvice')}</p>
        <ButtonLink to="/scan" className="w-full">
          {t('home.ctaScan')}
          <ArrowRight aria-hidden className="size-5" strokeWidth={2.5} />
        </ButtonLink>
      </Card>

      <div className="flex items-start gap-2">
        <DemoTag />
        <p className="text-xs leading-snug text-muted-foreground">{t('home.demoNote')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TILES.map(({ to, icon: Icon, titleKey, textKey }) => (
          <Link
            key={titleKey}
            to={to}
            className="rounded-card bg-card p-4 shadow-card transition-transform active:scale-[0.99]"
          >
            <IconTile icon={Icon} />
            <p className="mt-3 font-semibold text-ink">{t(titleKey)}</p>
            <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{t(textKey)}</p>
          </Link>
        ))}
      </div>

      <Card className="flex gap-3 p-4">
        <span aria-hidden className="w-1.5 shrink-0 rounded-full bg-brand" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-brand">{t('home.tipTitle')}</p>
          <p className="text-[15px] leading-snug text-ink">{t('home.tipText')}</p>
        </div>
      </Card>

      <Banner tone="warning">{t('home.disclaimer')}</Banner>

      <Link
        to="/admin"
        className="block py-2 text-center text-sm font-medium text-brand underline-offset-4 hover:underline"
      >
        {t('footer.adminLink')}
      </Link>
    </div>
  )
}