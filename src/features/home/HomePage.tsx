import { CloudRain, MapPin, Radio, ScanLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PILOT_ZONE } from '../../config/pilot'
import { Banner } from '../../shared/ui/Banner'
import { ButtonLink } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'

const SOURCES = [
  {
    titleKey: 'home.sourceResidents',
    textKey: 'home.sourceResidentsText',
    icon: ScanLine,
  },
  {
    titleKey: 'home.sourceWeather',
    textKey: 'home.sourceWeatherText',
    icon: CloudRain,
  },
  {
    titleKey: 'home.sourceSensors',
    textKey: 'home.sourceSensorsText',
    icon: Radio,
  },
] as const

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <p className="flex items-center gap-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          <MapPin aria-hidden className="size-4" />
          {PILOT_ZONE.nameRu} · {PILOT_ZONE.districtRu}
        </p>
        <h1 className="text-3xl leading-tight font-bold">{t('home.title')}</h1>
        <p className="text-muted-foreground">{t('home.lead')}</p>
        <div className="flex flex-col gap-3 pt-1">
          <ButtonLink to="/scan">
            <ScanLine aria-hidden className="size-5" />
            {t('home.ctaScan')}
          </ButtonLink>
          <ButtonLink to="/map" variant="secondary">
            {t('home.ctaMap')}
          </ButtonLink>
        </div>
      </section>

      <section aria-labelledby="sources-title" className="space-y-3">
        <h2 id="sources-title" className="text-lg font-semibold">
          {t('home.sourcesTitle')}
        </h2>
        <ul className="space-y-3">
          {SOURCES.map(({ titleKey, textKey, icon: Icon }) => (
            <li key={titleKey}>
              <Card className="flex gap-3">
                <Icon aria-hidden className="size-6 shrink-0 text-brand" />
                <div className="space-y-1">
                  <p className="font-semibold">{t(titleKey)}</p>
                  <p className="text-sm text-muted-foreground">{t(textKey)}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Banner tone="warning">{t('home.disclaimer')}</Banner>
    </div>
  )
}