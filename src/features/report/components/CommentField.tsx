import { useTranslation } from 'react-i18next'
import { COMMENT_MAX_LENGTH } from '../../../shared/types/report-contract'
import { cx } from '../../../shared/lib/cx'
import { commentLength } from '../lib/report-draft'

type CommentFieldProps = {
  value: string
  onChange: (value: string) => void
}

/**
 * Комментарий жителя: необязательный, до 500 символов (§7).
 * Счётчик считает символы так же, как Postgres (`char_length`), поэтому эмодзи
 * не «съедает» два места из лимита. `maxLength` не ставим: обрезка на лету
 * раздражает, честнее показать счётчик и заблокировать отправку.
 */
export function CommentField({ value, onChange }: CommentFieldProps) {
  const { t } = useTranslation()
  const length = commentLength(value)
  const tooLong = length > COMMENT_MAX_LENGTH

  return (
    <div className="space-y-1.5">
      <label htmlFor="report-comment" className="block text-sm font-semibold text-ink">
        {t('report.comment.label')}
      </label>
      <textarea
        id="report-comment"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={t('report.comment.placeholder')}
        aria-describedby="report-comment-hint"
        aria-invalid={tooLong}
        className={cx(
          'w-full resize-y rounded-card border-2 bg-card px-3 py-2 text-[15px] leading-snug text-foreground',
          'placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
          tooLong ? 'border-risk-high' : 'border-border',
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <p id="report-comment-hint" className="text-xs leading-snug text-muted-foreground">
          {t('report.comment.hint')}
        </p>
        <span
          className={cx(
            'shrink-0 text-xs font-semibold tabular-nums',
            tooLong ? 'text-risk-high' : 'text-muted-foreground',
          )}
        >
          {length}/{COMMENT_MAX_LENGTH}
        </span>
      </div>
    </div>
  )
}