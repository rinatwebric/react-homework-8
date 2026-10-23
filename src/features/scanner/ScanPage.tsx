import { ScanLine } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banner } from '../../shared/ui/Banner'
import { Card } from '../../shared/ui/Card'
import { ErrorState } from '../../shared/ui/ErrorState'
import { LoadingState } from '../../shared/ui/LoadingState'
import { ScreenHeader } from '../../shared/ui/ScreenHeader'
import { AssessmentResult } from './components/AssessmentResult'
import { PhotoInput } from './components/PhotoInput'
import { usePhotoScan } from './hooks/usePhotoScan'
import type { AnalyzeErrorCode } from './lib/analyze-photo'
import { photoProblemCode, type PhotoProblem } from './lib/photo-file'

/**
 * Срез 1: фото с телефона → сжатие → AI-оценка (analyze-photo) → результат.
 * Состояния экрана: idle → working (сжатие, оценка) → done | failed.
 * Дисклеймер виден всегда: AI не измеряет грунтовые воды (AGENTS.md).
 */
export function ScanPage() {
  const { t } = useTranslation()
  const { state, start, reset, clientId } = usePhotoScan()
  const [problem, setProblem] = useState<PhotoProblem | null>(null)

  const handlePick = useCallback(
    (file: File) => {
      setProblem(null)
      void start(file).then((outcome) => {
        if (!outcome.ok) setProblem(outcome.problem)
      })
    },
    [start],
  )

  const handleRescan = useCallback(() => {
    setProblem(null)
    reset()
  }, [reset])

  const errorCode: AnalyzeErrorCode | null =
    state.status === 'failed' ? state.error.code : problem ? photoProblemCode(problem) : null

  const previewUrl =
    state.status === 'working' || state.status === 'done' || state.status === 'failed'
      ? state.previewUrl
      : null

  const showInput = state.status === 'idle' || state.status === 'failed' || problem !== null

  return (
    <div className="space-y-4">
      <ScreenHeader title={t('scan.title')} />

      {state.status === 'idle' ? (
        <div
          className="relative aspect-4/3 overflow-hidden rounded-card bg-soft"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, rgb(23 69 122 / 0.07) 0 14px, transparent 14px 28px)',
          }}
        >
          <span className="absolute top-4 left-4 rounded-full bg-ink px-3 py-1 text-xs font-semibold text-on-ink">
            {t('scan.photoTag')}
          </span>
          <span className="absolute bottom-6 left-8 h-24 w-32 rounded-xl border-[3px] border-dashed border-risk-high-fill" />
          <span className="absolute top-16 right-10 h-16 w-24 rounded-xl border-[3px] border-dashed border-risk-elevated-fill" />
          <ScanLine
            aria-hidden
            className="absolute inset-0 m-auto size-12 text-brand/60"
            strokeWidth={1.5}
          />
        </div>
      ) : null}

      {previewUrl ? (
        <img
          src={previewUrl}
          alt={t('scan.previewAlt')}
          className="aspect-4/3 w-full rounded-card object-cover"
        />
      ) : null}

      {state.status === 'working' ? (
        <Card className="space-y-1">
          <LoadingState
            label={
              state.step === 'compressing'
                ? t('scan.processingCompress')
                : t('scan.processingAnalyze')
            }
          />
          <p className="text-center text-sm text-muted-foreground">{t('scan.processingNote')}</p>
        </Card>
      ) : null}

      {errorCode ? (
        <ErrorState title={t('scan.errorTitle')} message={t(`scan.errors.${errorCode}`)} />
      ) : null}

      {state.status === 'idle' ? (
        <Card className="space-y-1.5">
          <h2 className="text-base font-bold text-ink">{t('scan.hintTitle')}</h2>
          <p className="text-[15px] leading-snug text-muted-foreground">{t('scan.hintText')}</p>
        </Card>
      ) : null}

      {showInput ? <PhotoInput disabled={state.status === 'working'} onPick={handlePick} /> : null}

      {state.status === 'done' ? (
        <AssessmentResult result={state.result} clientId={clientId} onRescan={handleRescan} />
      ) : null}

      <Banner tone="info">{t('scan.aiLimit')}</Banner>
    </div>
  )
}