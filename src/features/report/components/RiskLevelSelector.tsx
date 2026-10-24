import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { cx } from '../../../shared/lib/cx'

export type ResidentRiskSeverity = 'moderate' | 'elevated' | 'critical'

type RiskLevelSelectorProps = {
  value: boolean // immediate_danger
  severity?: ResidentRiskSeverity
  onDangerChange: (danger: boolean) => void
  onSeverityChange?: (severity: ResidentRiskSeverity) => void
}

/**
 * Блок оценки риска подтопления жителем:
 * - Выбор уровня угрозы (умеренный / повышенный / критический / 112)
 * - При критическом риске активируется флаг `immediate_danger` с возможностью быстрого звонка 112.
 */
export function RiskLevelSelector({
  value,
  severity = value ? 'critical' : 'moderate',
  onDangerChange,
  onSeverityChange,
}: RiskLevelSelectorProps) {
  const levels: Array<{
    id: ResidentRiskSeverity
    label: string
    sublabel: string
    icon: typeof AlertTriangle
    color: string
    activeBorder: string
    activeBg: string
    isDanger: boolean
  }> = [
    {
      id: 'moderate',
      label: 'Умеренный риск',
      sublabel: 'Сырость, небольшая вода, угрозы жизни нет',
      icon: CheckCircle2,
      color: 'text-sky-600',
      activeBorder: 'border-sky-500',
      activeBg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-950 dark:text-sky-100',
      isDanger: false,
    },
    {
      id: 'elevated',
      label: 'Высокий риск',
      sublabel: 'Вода прибывает, есть угроза имуществу и постройкам',
      icon: AlertTriangle,
      color: 'text-amber-600',
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100',
      isDanger: false,
    },
    {
      id: 'critical',
      label: 'Критический / ЧС',
      sublabel: 'Угроза жизни, резкое затопление жилья (звонок 112)',
      icon: AlertOctagon,
      color: 'text-rose-600',
      activeBorder: 'border-rose-600',
      activeBg: 'border-rose-600 bg-rose-50 dark:bg-rose-950/50 text-rose-950 dark:text-rose-100',
      isDanger: true,
    },
  ]

  const handleSelect = (lvl: typeof levels[number]) => {
    onDangerChange(lvl.isDanger)
    if (onSeverityChange) {
      onSeverityChange(lvl.id)
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-bold text-ink">
          Уровень риска подтопления
        </label>
        <p className="text-xs text-muted-foreground">
          Оцените опасность ситуации для первоочередной обработки службой
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {levels.map((lvl) => {
          const Icon = lvl.icon
          const isSelected = lvl.isDanger ? value : (!value && severity === lvl.id)

          return (
            <button
              key={lvl.id}
              type="button"
              onClick={() => handleSelect(lvl)}
              className={cx(
                'flex items-start gap-3 rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.99]',
                isSelected
                  ? cx(lvl.activeBorder, lvl.activeBg, 'shadow-xs font-semibold')
                  : 'border-border/80 bg-card hover:bg-muted/40',
              )}
            >
              <div
                className={cx(
                  'flex size-8 shrink-0 items-center justify-center rounded-xl mt-0.5',
                  isSelected ? 'bg-white/80 dark:bg-black/30' : 'bg-muted',
                )}
              >
                <Icon className={cx('size-4.5', lvl.color)} strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold leading-tight">
                    {lvl.label}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-current text-white">
                      Выбрано
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-snug opacity-80 mt-0.5">
                  {lvl.sublabel}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {value && (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-rose-600 p-3 text-white shadow-md">
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight">
              Экстренная опасность для жизни?
            </p>
            <p className="text-[11px] text-white/90 leading-tight mt-0.5">
              Служба спасения Кыргызстана
            </p>
          </div>
          <a
            href="tel:112"
            className="shrink-0 rounded-xl bg-white px-3.5 py-1.5 text-xs font-extrabold text-rose-700 shadow-sm active:scale-95 transition-transform"
          >
            Позвонить 112
          </a>
        </div>
      )}
    </div>
  )
}
