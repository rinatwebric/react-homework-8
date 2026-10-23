import { useTranslation } from 'react-i18next'
import { WELL_DEPTH_MAX_M } from '../../../config/report'

export type WellDepthError = 'not_number' | 'too_deep' | 'negative' | null

type WellDepthFieldProps = {
  value: string
  onChange: (value: string) => void
  error: WellDepthError
}

/**
 * Необязательное поле: глубина воды в колодце. Пустое — «не знаю», это нормально.
 * Значение вводится в метрах, запятая разрешена (так пишут на телефоне).
 */
export function WellDepthField({ value, onChange, error }: WellDepthFieldProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <label htmlFor="well-depth" className="block text-base font-bold text-ink">
        {t('report.wellDepth.label')}
      </label>
      <div className="relative">
        <input
          id="well-depth"
          name="well-depth"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('report.wellDepth.placeholder')}
          aria-invalid={error !== null}
          aria-describedby="well-depth-hint"
          className="min-h-14 w-full rounded-2xl border-2 border-border bg-card px-4 pr-12 text-base text-ink placeholder:text-muted-foreground focus-visible:border-brand focus-visible:outline-none"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm font-semibold text-muted-foreground"
        >
          {t('report.wellDepth.unit')}
        </span>
      </div>
      <p
        id="well-depth-hint"
        className={error ? 'text-sm font-medium text-risk-high' : 'text-sm text-muted-foreground'}
      >
        {error ? t(`report.wellDepth.errors.${error}`) : t('report.wellDepth.hint', { max: WELL_DEPTH_MAX_M })}
      </p>
    </div>
  )
}