import { Archive, ArrowRight, ChevronDown, Droplet } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEMO_WATER_WEEK } from '../../config/demo'
import { Banner } from '../../shared/ui/Banner'
import { Card } from '../../shared/ui/Card'
import { IconTile } from '../../shared/ui/IconTile'

type FieldId = 'canal2' | 'canal1'

const FIELD_LABELS: Record<FieldId, string> = {
  canal2: 'water.fieldLabel',
  canal1: 'water.fieldAlt',
}

const ACTIONS = [
  { icon: ArrowRight, titleKey: 'water.actions.drainTitle', textKey: 'water.actions.drainText' },
  { icon: Archive, titleKey: 'water.actions.storeTitle', textKey: 'water.actions.storeText' },
  { icon: Droplet, titleKey: 'water.actions.irrigateTitle', textKey: 'water.actions.irrigateText' },
] as const

// Цвет столбика: прошедшие дни — голубой, пик — синий, спад — янтарный (макет 4).
const BAR_COLORS = [
  'bg-aqua',
  'bg-aqua',
  'bg-aqua',
  'bg-brand',
  'bg-brand',
  'bg-sun',
  'bg-sun',
] as const

export function WaterPage() {
  const { t } = useTranslation()
  const [field, setField] = useState<FieldId>('canal2')

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-muted-foreground">{t('water.kicker')}</p>
        <h1 className="text-2xl leading-tight font-extrabold text-ink">{t('water.title')}</h1>
      </header>

      <Card className="flex items-center gap-2 p-4">
        <label htmlFor="water-field" className="sr-only">
          {t('water.fieldHint')}
        </label>
        <select
          id="water-field"
          value={field}
          onChange={(event) => setField(event.target.value === 'canal1' ? 'canal1' : 'canal2')}
          className="w-full appearance-none bg-transparent text-base font-semibold text-ink focus-visible:outline-none"
        >
          {(Object.keys(FIELD_LABELS) as FieldId[]).map((id) => (
            <option key={id} value={id}>
              {t(FIELD_LABELS[id])}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="size-5 shrink-0 text-ink" strokeWidth={2.25} />
      </Card>

      <Card tone="ink" className="space-y-2 p-6">
        <p className="text-sm text-on-ink/70">{t('water.statusLabel')}</p>
        <p className="text-2xl font-extrabold tracking-tight">{t('water.status')}</p>
        <p className="text-sm leading-snug text-on-ink/85">{t('water.advice')}</p>
      </Card>

      <Card>
        <h2 className="text-lg font-bold text-ink">{t('water.weekTitle')}</h2>
        <ul className="mt-4 flex h-40 items-stretch gap-2">
          {DEMO_WATER_WEEK.map(({ day, value }, index) => (
            <li key={day} className="flex flex-1 flex-col items-center justify-end gap-2">
              <div className="flex w-full flex-1 items-end">
                <span
                  className={`w-full rounded-lg ${BAR_COLORS[index]}`}
                  style={{ height: `${Math.round(value * 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{t(`water.days.${day}`)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="divide-y divide-border p-0">
        {ACTIONS.map(({ icon, titleKey, textKey }) => (
          <div key={titleKey} className="flex items-start gap-3 p-4">
            <IconTile icon={icon} className="size-11" />
            <div className="space-y-0.5">
              <p className="font-semibold text-ink">{t(titleKey)}</p>
              <p className="text-sm leading-snug text-muted-foreground">{t(textKey)}</p>
            </div>
          </div>
        ))}
      </Card>

      <Banner tone="info">{t('water.demoNote')}</Banner>
    </div>
  )
}