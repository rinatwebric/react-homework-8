import { useCallback, useEffect, useState } from 'react'
import type { SubmitReportRequest } from '../../../shared/types/report-contract'
import {
  enqueueReport,
  getActiveQueueCount,
} from '../lib/queue-store'
import {
  initOfflineSync,
  isQueueSyncing,
  subscribeQueueChange,
  syncQueue,
} from '../lib/sync-manager'
import type { QueuedReportItem } from '../types'

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [queuedCount, setQueuedCount] = useState<number>(0)
  const [isSyncing, setIsSyncing] = useState<boolean>(isQueueSyncing())

  const refreshCount = useCallback(async () => {
    const count = await getActiveQueueCount()
    setQueuedCount(count)
    setIsSyncing(isQueueSyncing())
  }, [])

  useEffect(() => {
    initOfflineSync()
    void refreshCount()

    const handleOnline = () => {
      setIsOnline(true)
      void syncQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const unsubscribe = subscribeQueueChange(() => {
      void refreshCount()
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
    }
  }, [refreshCount])

  const enqueue = useCallback(
    async (payload: SubmitReportRequest): Promise<QueuedReportItem> => {
      const item = await enqueueReport(payload)
      await refreshCount()
      return item
    },
    [refreshCount],
  )

  const syncNow = useCallback(async () => {
    await syncQueue()
    await refreshCount()
  }, [refreshCount])

  return {
    isOnline,
    queuedCount,
    isSyncing,
    enqueue,
    syncNow,
  }
}
