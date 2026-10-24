import { Camera, Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { PILOT_ZONE } from '../../config/pilot'
import type { ReportCategory } from '../../shared/lib/categories'
import { createClientId } from '../../shared/lib/client-id'
import { Banner } from '../../shared/ui/Banner'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { ErrorState } from '../../shared/ui/ErrorState'
import { ScreenHeader } from '../../shared/ui/ScreenHeader'
import { readReportContext } from '../../shared/types/report-context'
import { CategoryPicker } from './components/CategoryPicker'
import { CommentField } from './components/CommentField'
import { DangerToggle } from './components/DangerToggle'
import { LocationSection } from './components/LocationSection'
import { ReportSent } from './components/ReportSent'
import { useGeolocation } from './hooks/useGeolocation'
import { hashDeviceId, readDeviceId } from './lib/device-id'
import {
  buildSubmitPayload,
  locationOffsetM,
  submissionBlock,
  type ReportDraft,
} from './lib/report-draft'
import { SubmitReportError, submitReport, type SubmitReportErrorCode } from './lib/submit-report'

/**
 * Срез 2, PR-2: заявка жителя v2.0 (§7).
 *
 * Обязательно: категория и координаты (GPS или пин в радиусе 300 м от GPS).
 * Необязательно: комментарий до 500 символов, фото с карты (или из галереи),
 * отметка «опасно для жизни». AI-оценка фото в заявку не входит — она нужна
 * только модератору (§8), поэтому и на форму не выводится.
 *
 * Все записи — только через Edge Function `submit-report` v4: у anon нет INSERT
 * в reports.
 */
export function ReportPage() {
  const { t } = useTranslation()
  const routeLocation = useLocation()
  const photo = useMemo(() => readReportContext(routeLocation.state), [routeLocation.state])

  const { state: geo, refining, locate, setManualPoint, availability } = useGeolocation()
  // client_id приходит с карты: фото уже лежит в его папке в бакете.
  const [clientId] = useState(() => photo?.clientId ?? createClientId())
  const [deviceHash, setDeviceHash] = useState<string | null>(null)
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [comment, setComment] = useState('')
  const [immediateDanger, setImmediateDanger] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState<{ id: string; duplicate: boolean } | null>(null)
  const [errorCode, setErrorCode] = useState<SubmitReportErrorCode | null>(null)

  useEffect(() => {
    let active = true
    const loadDeviceHash = async () => {
      try {
        const hash = await hashDeviceId(readDeviceId(window.localStorage))
        if (active) setDeviceHash(hash)
      } catch {
        // Без Web Crypto не отправим: кнопка останется неактивной, текст подскажет.
        if (active) setDeviceHash(null)
      }
    }
    void loadDeviceHash()
    return () => {
      active = false
    }
  }, [])

  const draft: ReportDraft = useMemo(
    () => ({
      clientId,
      deviceHash: deviceHash ?? '',
      category,
      comment,
      immediateDanger,
      point: geo.point,
      gps: geo.gps ? { lat: geo.gps.lat, lng: geo.gps.lng, accuracyM: geo.gps.accuracyM } : null,
      photoPath: photo?.photoPath ?? null,
    }),
    [clientId, deviceHash, category, comment, immediateDanger, geo.point, geo.gps, photo],
  )

  const block = submissionBlock(draft)
  const canSubmit = !submitting && deviceHash !== null && block === null

  const handleSubmit = useCallback(async () => {
    if (!deviceHash) return
    const built = buildSubmitPayload(draft)
    if (!built.ok) {
      setErrorCode(null)
      return
    }

    setSubmitting(true)
    setErrorCode(null)
    try {
      const response = await submitReport(built.payload)
      setSent(response)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setErrorCode(error instanceof SubmitReportError ? error.code : 'SERVER')
    } finally {
      setSubmitting(false)
    }
  }, [deviceHash, draft])

  if (sent) {
    return (
      <div className="space-y-4">
        <ScreenHeader title={t('report.sentHeader')} />
        <ReportSent reportId={sent.id} duplicate={sent.duplicate} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ScreenHeader title={t('report.title')} />
      <p className="-mt-2 text-sm leading-snug text-muted-foreground">{t('report.lead')}</p>

      {photo?.photoPath ? (
        <Card className="flex items-start gap-3">
          <Camera aria-hidden className="mt-0.5 size-5 shrink-0 text-ink" strokeWidth={2.25} />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink">{t('report.photo.attached')}</p>
            <p className="text-sm leading-snug text-muted-foreground">{t('report.photo.note')}</p>
          </div>
        </Card>
      ) : (
        <Banner tone="info" title={t('report.photo.noneTitle')}>
          {t('report.photo.noneText')}
        </Banner>
      )}

      <CategoryPicker value={category} onChange={setCategory} />

      <LocationSection
        state={geo}
        refining={refining}
        offsetM={locationOffsetM(draft)}
        availability={availability}
        onRelocate={() => void locate()}
        onPlaceManually={() => setManualPoint(PILOT_ZONE.center)}
        onMove={setManualPoint}
      />

      <Card className="space-y-3">
        <CommentField value={comment} onChange={setComment} />
        <DangerToggle value={immediateDanger} onChange={setImmediateDanger} />
      </Card>

      {errorCode ? (
        <ErrorState
          title={t('report.errorTitle')}
          message={t(`report.errors.${errorCode}`)}
          onRetry={() => void handleSubmit()}
        />
      ) : null}

      <div className="space-y-2">
        <Button className="w-full" disabled={!canSubmit} onClick={() => void handleSubmit()}>
          <Send aria-hidden className="size-5" strokeWidth={2.25} />
          {submitting ? t('report.submitting') : t('report.submit')}
        </Button>
        {block ? (
          <p className="text-center text-sm text-muted-foreground">{t(`report.blocks.${block}`)}</p>
        ) : null}
      </div>

      <Banner tone="info">{t('report.privacy')}</Banner>
    </div>
  )
}