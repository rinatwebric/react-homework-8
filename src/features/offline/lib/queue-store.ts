import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SubmitReportRequest } from '../../../shared/types/report-contract'
import type { QueuedReportItem } from '../types'
import { createQueuedItem } from './queue-reducer'

const DB_NAME = 'suutech'
const DB_VERSION = 1
const STORE_NAME = 'report_queue'

interface SuuTechDbSchema extends DBSchema {
  [STORE_NAME]: {
    key: string
    value: QueuedReportItem
    indexes: {
      by_status: string
      by_created: string
    }
  }
}

let dbPromise: Promise<IDBPDatabase<SuuTechDbSchema>> | null = null

export function getOfflineDatabase(): Promise<IDBPDatabase<SuuTechDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<SuuTechDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'client_id' })
          store.createIndex('by_status', 'status')
          store.createIndex('by_created', 'created_at')
        }
      },
    })
  }
  return dbPromise
}

/** Сохранение отчёта в очередь IndexedDB */
export async function enqueueReport(
  payload: SubmitReportRequest,
): Promise<QueuedReportItem> {
  const db = await getOfflineDatabase()
  const existing = await db.get(STORE_NAME, payload.client_id)
  if (existing) {
    return existing
  }

  const item = createQueuedItem(payload)
  await db.put(STORE_NAME, item)
  return item
}

/** Получение всех элементов очереди */
export async function getAllQueueItems(): Promise<QueuedReportItem[]> {
  try {
    const db = await getOfflineDatabase()
    return await db.getAll(STORE_NAME)
  } catch (err) {
    console.warn('[offline-store] Ошибка чтения IndexedDB:', err)
    return []
  }
}

/** Получение количества активных (не done) элементов */
export async function getActiveQueueCount(): Promise<number> {
  try {
    const items = await getAllQueueItems()
    return items.filter((item) => item.status === 'queued' || item.status === 'uploading').length
  } catch {
    return 0
  }
}

/** Обновление элемента в базе */
export async function putQueueItem(item: QueuedReportItem): Promise<void> {
  try {
    const db = await getOfflineDatabase()
    await db.put(STORE_NAME, item)
  } catch (err) {
    console.warn('[offline-store] Ошибка записи в IndexedDB:', err)
  }
}

/** Удаление элемента по client_id */
export async function deleteQueueItem(clientId: string): Promise<void> {
  try {
    const db = await getOfflineDatabase()
    await db.delete(STORE_NAME, clientId)
  } catch (err) {
    console.warn('[offline-store] Ошибка удаления из IndexedDB:', err)
  }
}

/** Очистка завершённых отчётов */
export async function cleanupDoneItems(): Promise<void> {
  try {
    const db = await getOfflineDatabase()
    const items = await db.getAll(STORE_NAME)
    const tx = db.transaction(STORE_NAME, 'readwrite')
    for (const item of items) {
      if (item.status === 'done') {
        void tx.store.delete(item.client_id)
      }
    }
    await tx.done
  } catch (err) {
    console.warn('[offline-store] Ошибка очистки done:', err)
  }
}
