import type { SubmitReportRequest } from '../../shared/types/report-contract'

export type QueueItemStatus = 'draft' | 'queued' | 'uploading' | 'done' | 'failed'

export interface QueuedReportItem {
  client_id: string
  payload: SubmitReportRequest
  status: QueueItemStatus
  attempts: number
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface OfflineQueueState {
  isOnline: boolean
  queuedCount: number
  isSyncing: boolean
  lastSyncAt: string | null
}
