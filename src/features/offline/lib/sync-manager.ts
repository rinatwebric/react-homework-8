import { submitReport, SubmitReportError } from '../../report/lib/submit-report'
import {
  isReadyForRetry,
  markDone,
  markError,
  markUploading,
  recoverStaleUploading,
} from './queue-reducer'
import {
  cleanupDoneItems,
  deleteQueueItem,
  getAllQueueItems,
  putQueueItem,
} from './queue-store'

type QueueChangeListener = () => void

const listeners = new Set<QueueChangeListener>()
let isSyncing = false
let initialized = false

export function subscribeQueueChange(listener: QueueChangeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener()
    } catch (err) {
      console.error('[sync-manager] Ошибка слушателя очереди:', err)
    }
  }
}

export function isQueueSyncing(): boolean {
  return isSyncing
}

/**
 * Основной цикл синхронизации очереди отчётов с Edge Function submit-report:
 * - Выполняется по очереди для каждой готовой к отправке заявки.
 * - Сохраняет client_id (идемпотентность на стороне сервера).
 * - Успешные заявки помечаются как done и удаляются.
 * - Ошибки сети планируют повтор через экспоненциальный backoff.
 */
export async function syncQueue(): Promise<{ sent: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { sent: 0, failed: 0 }
  }

  if (isSyncing) {
    return { sent: 0, failed: 0 }
  }

  isSyncing = true
  notifyListeners()

  let sentCount = 0
  let failedCount = 0

  try {
    const rawItems = await getAllQueueItems()
    if (rawItems.length === 0) {
      return { sent: 0, failed: 0 }
    }

    // 1. Восстанавливаем зависшие записи (>2 мин)
    const recovered = recoverStaleUploading(rawItems)
    for (const item of recovered) {
      if (item.status === 'queued') {
        await putQueueItem(item)
      }
    }

    // 2. Отбираем готовые к отправке
    const now = Date.now()
    const readyItems = recovered.filter((item) => isReadyForRetry(item, now))

    for (const item of readyItems) {
      // Ставим uploading
      const uploadingItem = markUploading(item)
      await putQueueItem(uploadingItem)
      notifyListeners()

      try {
        await submitReport(item.payload)
        // Успех -> done
        const doneItem = markDone(uploadingItem)
        await putQueueItem(doneItem)
        // Удаляем отправленный отчёт из очереди
        await deleteQueueItem(item.client_id)
        sentCount++
      } catch (err) {
        failedCount++
        const isFatal =
          err instanceof SubmitReportError &&
          (err.code === 'INVALID_INPUT' || err.code === 'NOT_CONFIGURED')
        const message = err instanceof Error ? err.message : String(err)
        const erroredItem = markError(uploadingItem, message, isFatal)
        await putQueueItem(erroredItem)
      }

      notifyListeners()
    }

    await cleanupDoneItems()
  } finally {
    isSyncing = false
    notifyListeners()
  }

  return { sent: sentCount, failed: failedCount }
}

/** Инициализация фоновой синхронизации и слушателей */
export function initOfflineSync(): void {
  if (initialized || typeof window === 'undefined') return
  initialized = true

  // При появлении сети
  window.addEventListener('online', () => {
    void syncQueue()
  })

  // При старте приложения
  if (navigator.onLine) {
    // Небольшая задержка для завершения гидратации/рендера
    setTimeout(() => {
      void syncQueue()
    }, 1000)
  }
}
