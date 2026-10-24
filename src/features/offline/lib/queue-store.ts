import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { SubmitReportRequest } from '../../../shared/types/report-contract'
import type { QueuedReportItem } from '../types'
import { createQueuedItem } from './queue-reducer'

const DB_NAME = 'suutech'
const DB_VERSION = 1
const STORE_NAME = 'report_queue'
const LOCAL_STORAGE_KEY = 'suutech_offline_reports'

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

function getLocalItems(): QueuedReportItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as QueuedReportItem[]) : []
  } catch {
    return []
  }
}

function saveLocalItem(item: QueuedReportItem): void {
  try {
    const items = getLocalItems()
    const idx = items.findIndex((i) => i.client_id === item.client_id)
    if (idx >= 0) {
      items[idx] = item
    } else {
      items.push(item)
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore quota errors
  }
}

function removeLocalItem(clientId: string): void {
  try {
    const items = getLocalItems().filter((i) => i.client_id !== clientId)
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

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

/** Сохранение отчёта в очередь (IndexedDB + надёжный localStorage fallback) */
export async function enqueueReport(
  payload: SubmitReportRequest,
): Promise<QueuedReportItem> {
  const item = createQueuedItem(payload)
  saveLocalItem(item)

  try {
    const db = await getOfflineDatabase()
    const existing = await db.get(STORE_NAME, payload.client_id)
    if (existing) {
      return existing
    }
    await db.put(STORE_NAME, item)
  } catch (err) {
    console.warn('[offline-store] Fallback на localStorage при сбое IndexedDB:', err)
  }

  return item
}

/** Получение всех элементов очереди из обоих хранилищ */
export async function getAllQueueItems(): Promise<QueuedReportItem[]> {
  const local = getLocalItems()
  try {
    const db = await getOfflineDatabase()
    const dbItems = await db.getAll(STORE_NAME)
    const map = new Map<string, QueuedReportItem>()
    for (const item of local) map.set(item.client_id, item)
    for (const item of dbItems) map.set(item.client_id, item)
    return Array.from(map.values())
  } catch {
    return local
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

/** Обновление элемента в базе и localStorage */
export async function putQueueItem(item: QueuedReportItem): Promise<void> {
  saveLocalItem(item)
  try {
    const db = await getOfflineDatabase()
    await db.put(STORE_NAME, item)
  } catch (err) {
    console.warn('[offline-store] Ошибка записи в IndexedDB:', err)
  }
}

/** Удаление элемента по client_id */
export async function deleteQueueItem(clientId: string): Promise<void> {
  removeLocalItem(clientId)
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
    const items = getLocalItems().filter((item) => item.status !== 'done')
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }

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
