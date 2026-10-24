import { AlertOctagon, AlertTriangle, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cx } from '../../../shared/lib/cx'

export type ResidentRiskSeverity = 'moderate' | 'elevated' | 'critical'

type RiskLevelSelectorProps = {
  severity: ResidentRiskSeverity
  onSelect: (severity: ResidentRiskSeverity) => void
}

/**
 * Блок выбора уровня риска подтопления жителем:
 * - Умеренный риск: стандартная штатная заявка
 * - Высокий риск: повышенная срочность
 * - Критический риск / ЧС: угроза жизни/жилью, активирует флаг immediate_danger и кнопку 112
 */
export function RiskLevelSelector({
  severity,
  onSelect,
}: RiskLevelSelectorProps) {
  const { t } = useTranslation()

  const levels: Array<{
    id: ResidentRiskSeverity
    label: string
    sublabel: string
    icon: typeof AlertTriangle
    activeClasses: string
    iconBg: string
    iconColor: string
  }> = [
    {
      id: 'moderate',
      label: t('report.riskLevel.moderate.label', 'Умеренный риск'),
      sublabel: t('report.riskLevel.moderate.sublabel', 'Сырость, небольшая вода, угрозы жизни нет'),
      icon: ShieldCheck,
      activeClasses: 'border-blue-500 bg-blue-50/70 text-blue-950 shadow-xs ring-1 ring-blue-500/30',
      iconBg: 'bg-blue-100 text-blue-700',
      iconColor: 'text-blue-700',
    },
    {
      id: 'elevated',
      label: t('report.riskLevel.elevated.label', 'Высокий риск'),
      sublabel: t('report.riskLevel.elevated.sublabel', 'Вода прибывает, есть угроза имуществу и постройкам'),
      icon: AlertTriangle,
      activeClasses: 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-xs ring-1 ring-amber-500/30',
      iconBg: 'bg-amber-100 text-amber-700',
      iconColor: 'text-amber-700',
    },
    {
      id: 'critical',
      label: t('report.riskLevel.critical.label', 'Критический / ЧС'),
      sublabel: t('report.riskLevel.critical.sublabel', 'Угроза жизни, резкое затопление (звонок 112)'),
      icon: AlertOctagon,
      activeClasses: 'border-rose-600 bg-rose-50/70 text-rose-950 shadow-xs ring-1 ring-rose-600/30',
      iconBg: 'bg-rose-100 text-rose-700',
      iconColor: 'text-rose-700',
    },
  ]

  return (
    <div className="space-y-2.5">
      <div>
        <label className="text-sm font-bold text-ink">
          {t('report.riskLevel.title', 'Уровень риска подтопления')}
        </label>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('report.riskLevel.hint', 'Оцените опасность ситуации для определения приоритета выезда службы')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {levels.map((lvl) => {
          const Icon = lvl.icon
          const isSelected = severity === lvl.id

          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => onSelect(lvl.id)}
              className={cx(
                'flex items-start gap-3 rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.99]',
                isSelected
                  ? lvl.activeClasses
                  : 'border-border/80 bg-card hover:bg-muted/40 text-foreground',
              )}
            >
              <div
                className={cx(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors mt-0.5',
                  lvl.iconBg,
                )}
              >
                <Icon className={cx('size-5', lvl.iconColor)} strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={cx('text-sm leading-tight', isSelected ? 'font-bold' : 'font-semibold')}>
                    {lvl.label}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-current text-white">
                      {t('report.riskLevel.selected', 'Выбрано')}
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-snug opacity-80 mt-1">
                  {lvl.sublabel}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {severity === 'critical' && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-rose-600 p-3.5 text-white shadow-md animate-in fade-in">
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight">
              {t('report.riskLevel.emergencyTitle', 'Экстренная опасность для жизни?')}
            </p>
            <p className="text-[11px] text-white/90 leading-tight mt-0.5">
              {t('report.riskLevel.emergencyDesc', 'Служба спасения Кыргызстана (круглосуточно)')}
            </p>
          </div>
          <a
            href="tel:112"
            className="shrink-0 rounded-xl bg-white px-3.5 py-1.5 text-xs font-extrabold text-rose-700 shadow-sm active:scale-95 transition-transform"
          >
            {t('report.riskLevel.call112', 'Позвонить 112')}
          </a>
        </div>
      )}
    </div>
  )
}
