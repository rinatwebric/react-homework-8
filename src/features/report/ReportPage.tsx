import { Send } from 'lucide-react'
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
import type { WeatherSnapshot } from '../../shared/types/report-contract'
import { useWeather } from '../weather/hooks/useWeather'
import { CategoryPicker } from './components/CategoryPicker'
import { CommentField } from './components/CommentField'
import { RiskLevelSelector, type ResidentRiskSeverity } from './components/RiskLevelSelector'
import { LocationSection } from './components/LocationSection'
import { PhotoField } from './components/PhotoField'
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
import { useOfflineQueue } from '../offline/hooks/useOfflineQueue'

/**
 * Срез 2 & 3: заявка жителя v2.0 (§7, §10, §11).
 *
 * Обязательно: категория и координаты (GPS или пин в радиусе 300 м от GPS).
 * Необязательно: комментарий до 500 символов, фото (с камеры или из галереи),
 * отметка «опасно для жизни».
 * Срез 3: при наличии погодных данных снимок погоды (weather_snapshot)
 * автоматически прикрепляется к заявке (если недоступен — null, отправка не блокируется).
 * Срез 5: при отсутствии связи или сетевых сбоях отчет мгновенно сохраняется в очередь.
 */
export function ReportPage() {
  const { t } = useTranslation()
  const routeLocation = useLocation()
  const routePhoto = useMemo(() => readReportContext(routeLocation.state), [routeLocation.state])

  const { state: geo, refining, locate, setManualPoint, availability } = useGeolocation()
  const [clientId] = useState(() => routePhoto?.clientId ?? createClientId())
  const [photoPath, setPhotoPath] = useState<string | null>(() => routePhoto?.photoPath ?? null)
  const [deviceHash, setDeviceHash] = useState<string | null>(null)
  const [category, setCategory] = useState<ReportCategory | null>(null)
  const [riskSeverity, setRiskSeverity] = useState<ResidentRiskSeverity>('moderate')
  const [comment, setComment] = useState('')
  const [immediateDanger, setImmediateDanger] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState<{ id: string; duplicate: boolean } | null>(null)
  const [offlineSent, setOfflineSent] = useState<{ id: string } | null>(null)
  const [errorCode, setErrorCode] = useState<SubmitReportErrorCode | null>(null)
  const { enqueue } = useOfflineQueue()

  // Получаем погоду для текущей точки (Срез 3, §10)
  const { weather } = useWeather({
    lat: geo.point?.lat,
    lng: geo.point?.lng,
  })

  const weatherSnapshot: WeatherSnapshot | null = useMemo(() => {
    if (!weather) return null
    return {
      captured_at: new Date().toISOString(),
      temperature_c: weather.temp_c,
      precipitation_mm: weather.precip_mm,
      humidity_pct: weather.humidity,
    }
  }, [weather])

  useEffect(() => {
    let active = true
    const loadDeviceHash = async () => {
      try {
        const hash = await hashDeviceId(readDeviceId(window.localStorage))
        if (active) setDeviceHash(hash)
      } catch {
        // Fallback-хэш из случайного UUID при невозможности Web Crypto
        if (active) setDeviceHash('0'.repeat(64))
      }
    }
    void loadDeviceHash()
    return () => {
      active = false
    }
  }, [])

  const handleRiskChange = (sev: ResidentRiskSeverity) => {
    setRiskSeverity(sev)
    setImmediateDanger(sev === 'critical')
  }

  const draft: ReportDraft = useMemo(
    () => ({
      clientId,
      deviceHash: deviceHash ?? '',
      category,
      comment,
      immediateDanger,
      point: geo.point,
      gps: geo.gps ? { lat: geo.gps.lat, lng: geo.gps.lng, accuracyM: geo.gps.accuracyM } : null,
      photoPath,
      weatherSnapshot,
    }),
    [clientId, deviceHash, category, comment, immediateDanger, geo.point, geo.gps, photoPath, weatherSnapshot],
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

    // Если сеть заведомо недоступна — сохраняем сразу в офлайн-очередь
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        await enqueue(built.payload)
        setOfflineSent({ id: built.payload.client_id })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (err) {
        console.error('[report] Ошибка сохранения офлайн:', err)
        setErrorCode('SERVER')
      } finally {
        setSubmitting(false)
      }
      return
    }

    try {
      const response = await submitReport(built.payload)
      setSent(response)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      // При сетевой ошибке, таймауте или обрыве связи — бесшовно сохраняем в офлайн-очередь
      const isNetworkIssue =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (error instanceof SubmitReportError &&
          (error.code === 'NETWORK' || error.code === 'TIMEOUT')) ||
        error instanceof TypeError

      if (isNetworkIssue) {
        try {
          await enqueue(built.payload)
          setOfflineSent({ id: built.payload.client_id })
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        } catch (queueErr) {
          console.error('[report] Ошибка очереди:', queueErr)
        }
      }
      setErrorCode(error instanceof SubmitReportError ? error.code : 'SERVER')
    } finally {
      setSubmitting(false)
    }
  }, [deviceHash, draft, enqueue])

  if (sent) {
    return (
      <div className="space-y-4">
        <ScreenHeader title={t('report.sentHeader')} />
        <ReportSent reportId={sent.id} duplicate={sent.duplicate} />
      </div>
    )
  }

  if (offlineSent) {
    return (
      <div className="space-y-4">
        <ScreenHeader title={t('report.offlineHeader', 'Заявка сохранена')} />
        <ReportSent reportId={offlineSent.id} duplicate={false} isOffline={true} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ScreenHeader title={t('report.title')} />
      <p className="-mt-2 text-sm leading-snug text-muted-foreground">{t('report.lead')}</p>

      <CategoryPicker value={category} onChange={setCategory} />

      <PhotoField clientId={clientId} photoPath={photoPath} onChange={setPhotoPath} />

      <LocationSection
        state={geo}
        refining={refining}
        offsetM={locationOffsetM(draft)}
        availability={availability}
        onRelocate={() => void locate()}
        onPlaceManually={() => setManualPoint(PILOT_ZONE.center)}
        onMove={setManualPoint}
      />

      <Card className="space-y-4 p-4">
        <RiskLevelSelector
          severity={riskSeverity}
          onSelect={handleRiskChange}
        />
        <CommentField value={comment} onChange={setComment} />
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
