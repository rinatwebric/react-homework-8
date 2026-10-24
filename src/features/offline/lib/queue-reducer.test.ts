import { describe, expect, it } from 'vitest'
import type { SubmitReportRequest } from '../../../shared/types/report-contract'
import {
  calculateBackoffMs,
  createQueuedItem,
  isReadyForRetry,
  markDone,
  markError,
  markUploading,
  recoverStaleUploading,
} from './queue-reducer'

const MOCK_PAYLOAD: SubmitReportRequest = {
  contract_version: '2.0',
  client_id: '12345678-1234-4234-8234-123456789abc',
  category: 'basement_water',
  comment: 'Вода сочится в подвал',
  immediate_danger: false,
  point: { lat: 42.348, lng: 76.167 },
  gps: { lat: 42.348, lng: 76.167, accuracy_m: 12 },
  photo_path: null,
  weather_snapshot: null,
  device_hash: 'a'.repeat(64),
}

describe('queue-reducer', () => {
  it('createQueuedItem инициализирует статус queued с 0 попыток', () => {
    const item = createQueuedItem(MOCK_PAYLOAD, '2026-10-25T01:00:00.000Z')
    expect(item.status).toBe('queued')
    expect(item.client_id).toBe(MOCK_PAYLOAD.client_id)
    expect(item.attempts).toBe(0)
    expect(item.last_error).toBeNull()
  })

  it('markUploading переводит элемент в статус uploading', () => {
    const initial = createQueuedItem(MOCK_PAYLOAD, '2026-10-25T01:00:00.000Z')
    const uploading = markUploading(initial, '2026-10-25T01:01:00.000Z')
    expect(uploading.status).toBe('uploading')
    expect(uploading.updated_at).toBe('2026-10-25T01:01:00.000Z')
  })

  it('markDone переводит элемент в done и очищает ошибки', () => {
    const initial = createQueuedItem(MOCK_PAYLOAD)
    const done = markDone(initial, '2026-10-25T01:02:00.000Z')
    expect(done.status).toBe('done')
    expect(done.last_error).toBeNull()
  })

  it('markError при сетевой ошибке возвращает в queued и увеличивает attempts', () => {
    const initial = createQueuedItem(MOCK_PAYLOAD)
    const errored = markError(initial, 'Network timeout', false, '2026-10-25T01:03:00.000Z')
    expect(errored.status).toBe('queued')
    expect(errored.attempts).toBe(1)
    expect(errored.last_error).toBe('Network timeout')
  })

  it('markError при фатальной ошибке переводит в failed', () => {
    const initial = createQueuedItem(MOCK_PAYLOAD)
    const failed = markError(initial, 'Invalid input 400', true, '2026-10-25T01:04:00.000Z')
    expect(failed.status).toBe('failed')
    expect(failed.attempts).toBe(1)
    expect(failed.last_error).toBe('Invalid input 400')
  })

  it('calculateBackoffMs рассчитывает экспоненциальную задержку с лимитом', () => {
    expect(calculateBackoffMs(0)).toBe(0)
    expect(calculateBackoffMs(1)).toBe(5000)
    expect(calculateBackoffMs(2)).toBe(10000)
    expect(calculateBackoffMs(3)).toBe(20000)
    expect(calculateBackoffMs(4)).toBe(40000)
    expect(calculateBackoffMs(10)).toBe(300000) // capped at 5 mins
  })

  it('recoverStaleUploading возвращает зависшие в uploading записи старше 2 минут', () => {
    const baseTime = 1700000000000
    const staleTime = new Date(baseTime - 130000).toISOString()
    const freshTime = new Date(baseTime - 30000).toISOString()

    const staleItem = {
      ...createQueuedItem(MOCK_PAYLOAD),
      status: 'uploading' as const,
      updated_at: staleTime,
    }
    const freshItem = {
      ...createQueuedItem({ ...MOCK_PAYLOAD, client_id: 'fresh-id' }),
      status: 'uploading' as const,
      updated_at: freshTime,
    }

    const recovered = recoverStaleUploading([staleItem, freshItem], baseTime)
    expect(recovered[0]?.status).toBe('queued')
    expect(recovered[1]?.status).toBe('uploading')
  })

  it('isReadyForRetry учитывает backoff по времени', () => {
    const baseTime = 1700000000000
    const item1 = {
      ...createQueuedItem(MOCK_PAYLOAD),
      attempts: 0,
      updated_at: new Date(baseTime).toISOString(),
    }
    expect(isReadyForRetry(item1, baseTime)).toBe(true)

    const item2 = {
      ...createQueuedItem(MOCK_PAYLOAD),
      attempts: 2, // backoff = 10 000 ms
      updated_at: new Date(baseTime).toISOString(),
    }
    expect(isReadyForRetry(item2, baseTime + 5000)).toBe(false)
    expect(isReadyForRetry(item2, baseTime + 11000)).toBe(true)
  })
})
