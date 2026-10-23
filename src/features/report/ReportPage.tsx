import { Send } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import { PILOT_ZONE } from '../../config/pilot'
import { createClientId } from '../../shared/lib/client-id'
import { distanceMeters } from '../../shared/lib/geo'
import { toZoneRisk } from '../../shared/lib/risk'
import { Banner } from '../../shared/ui/Banner'
import { Button } from '../../shared/ui/Button'
import { Card } from '../../shared/ui/Card'
import { ErrorState } from '../../shared/ui/ErrorState'
import { RiskBadge } from '../../shared/ui/RiskBadge'
import { ScreenHeader } from '../../shared/ui/ScreenHeader'
import { readReportContext } from '../../shared/types/report-context'
import { LocationSection } from './components/LocationSection'
import { ReportSent } from './components/ReportSent'
import { WaterBasementField } from './components/WaterBasementField'
import { WellDepthField } from './components/WellDepthField'
import { useGeolocation } from './hooks/useGeolocation'
import { hashDeviceId, readDeviceId } from './lib/device-id'
import {
  buildSubmitPayload,
  parseWellDepth,
  submissionBlock,
  type ReportDraft,
} from './lib/report-draft'
import { SubmitReportError, submitReport, type SubmitReportErrorCode } from './lib/submit-report'

/**
 * Срез 2, PR-1: отчёт жителя.
 *
 * Обязательно: координаты (GPS или пин на карте) и ответ «вода в подвале».
 * Необязательно: фото с AI-оценкой (приходит из сканера) и глубина колодца.
 * Все записи — только через Edge Function `submit-report`: у anon нет INSERT в reports.
 */
export function ReportPage() {
  const { t } = useTranslation()
  const routeLocation = useLocation()
  const photo = useMemo(() => readReportContext(routeLocation.state), [routeLocation.state])

  const { state: geo, refining, locate, setManualPoint, availability } = useGeolocation()
  const [clientId] = useState(createClientId)
  const [deviceHash, setDeviceHash] = useState<string | null>(null)
  const [waterInBasement, setWaterInBasement] = useState<boolean | null>(null)
  const [wellDepthRaw, setWellDepthRaw] = useState('')
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

  const wellParsed = parseWellDepth(wellDepthRaw)
  const wellError = wellParsed.ok ? null : wellParsed.error

  const draft: ReportDraft = {
    clientId,
    deviceHash: deviceHash ?? '',
    point: geo.point,
    accuracyM: geo.manual ? null : (geo.gps?.accuracyM ?? null),
    waterInBasement,
    wellDepthRaw,
    gpsOffsetM: geo.gps && geo.point && geo.manual ? distanceMeters(geo.gps, geo.point) : 0,
    photo,
  }

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

      {photo?.riskLevel ? (
        <Card className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-ink">{t('report.photoAttached')}</p>
            <p className="text-sm leading-snug text-muted-foreground">
              {t('report.photoAttachedNote')}
            </p>
          </div>
          <RiskBadge level={toZoneRisk(photo.riskLevel)} />
        </Card>
      ) : (
        <Banner tone="info" title={t('report.noPhotoTitle')}>
          {t('report.noPhotoText')}
        </Banner>
      )}

      <LocationSection
        state={geo}
        refining={refining}
        offsetM={draft.gpsOffsetM}
        availability={availability}
        onRelocate={() => void locate()}
        onPlaceManually={() => setManualPoint(PILOT_ZONE.center)}
        onMove={setManualPoint}
      />

      <Card className="space-y-5">
        <WaterBasementField value={waterInBasement} onChange={setWaterInBasement} />
        <WellDepthField value={wellDepthRaw} onChange={setWellDepthRaw} error={wellError} />
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