import type { SubmitReportRequest } from '../../../shared/types/report-contract'
import type { QueuedReportItem } from '../types'

export const BASE_BACKOFF_MS = 5_000
export const MAX_BACKOFF_MS = 300_000 // 5 минут
export const STALE_UPLOADING_MS = 120_000 // 2 минуты

/** Расчёт экспоненциальной задержки перед повторной попыткой: 5с * 2^attempts (до 5 мин) */
export function calculateBackoffMs(attempts: number): number {
  if (attempts <= 0) return 0
  const factor = Math.min(attempts - 1, 6)
  return Math.min(BASE_BACKOFF_MS * Math.pow(2, factor), MAX_BACKOFF_MS)
}

/** Создание нового элемента очереди из валидного черновика */
export function createQueuedItem(
  payload: SubmitReportRequest,
  nowIso = new Date().toISOString(),
): QueuedReportItem {
  return {
    client_id: payload.client_id,
    payload,
    status: 'queued',
    attempts: 0,
    last_error: null,
    created_at: nowIso,
    updated_at: nowIso,
  }
}

/** Перевод в статус загрузки */
export function markUploading(
  item: QueuedReportItem,
  nowIso = new Date().toISOString(),
): QueuedReportItem {
  return {
    ...item,
    status: 'uploading',
    updated_at: nowIso,
  }
}

/** Перевод в статус завершённого (успех) */
export function markDone(
  item: QueuedReportItem,
  nowIso = new Date().toISOString(),
): QueuedReportItem {
  return {
    ...item,
    status: 'done',
    last_error: null,
    updated_at: nowIso,
  }
}

/**
 * Обработка ошибки отправки:
 * - Если ошибка фатальная (4xx, кроме 429) -> статус 'failed'
 * - Если ошибка сети / таймаут / 5xx -> возврат в 'queued' с инкрементом attempts
 */
export function markError(
  item: QueuedReportItem,
  errorMessage: string,
  isFatal = false,
  nowIso = new Date().toISOString(),
): QueuedReportItem {
  if (isFatal) {
    return {
      ...item,
      status: 'failed',
      attempts: item.attempts + 1,
      last_error: errorMessage,
      updated_at: nowIso,
    }
  }

  return {
    ...item,
    status: 'queued',
    attempts: item.attempts + 1,
    last_error: errorMessage,
    updated_at: nowIso,
  }
}

/** Восстановление зависших в uploading записей (> 2 минут) */
export function recoverStaleUploading(
  items: QueuedReportItem[],
  nowMs = Date.now(),
  staleTimeoutMs = STALE_UPLOADING_MS,
): QueuedReportItem[] {
  return items.map((item) => {
    if (item.status !== 'uploading') return item
    const updatedMs = new Date(item.updated_at).getTime()
    if (Number.isNaN(updatedMs) || nowMs - updatedMs >= staleTimeoutMs) {
      return {
        ...item,
        status: 'queued',
        updated_at: new Date(nowMs).toISOString(),
      }
    }
    return item
  })
}

/** Проверка, подошло ли время для следующей попытки с учётом backoff */
export function isReadyForRetry(item: QueuedReportItem, nowMs = Date.now()): boolean {
  if (item.status !== 'queued') return false
  if (item.attempts === 0) return true
  const updatedMs = new Date(item.updated_at).getTime()
  if (Number.isNaN(updatedMs)) return true
  const waitMs = calculateBackoffMs(item.attempts)
  return nowMs - updatedMs >= waitMs
}
