import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getReportPhotoUrl, uploadReportPhoto } from './storage'

vi.mock('./supabase', () => ({
  supabaseConfig: {
    url: 'https://test-project.supabase.co',
    anonKey: 'anon-key-test-1234567890abcdef',
  },
}))

describe('storage: getReportPhotoUrl', () => {
  it('возвращает null, если photoPath пуст, null или undefined', () => {
    expect(getReportPhotoUrl(null)).toBeNull()
    expect(getReportPhotoUrl(undefined)).toBeNull()
    expect(getReportPhotoUrl('')).toBeNull()
  })

  it('формирует правильный публичный URL и очищает ведущие слэши', () => {
    const url = getReportPhotoUrl('client-123/photo-1.jpg')
    expect(url).toBe(
      'https://test-project.supabase.co/storage/v1/object/public/report-photos/client-123/photo-1.jpg',
    )

    const urlWithSlash = getReportPhotoUrl('/client-123/photo-1.jpg')
    expect(urlWithSlash).toBe(
      'https://test-project.supabase.co/storage/v1/object/public/report-photos/client-123/photo-1.jpg',
    )
  })
})

describe('storage: uploadReportPhoto', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('успешно загружает файл и возвращает objectPath с clientId', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/jpeg' })

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      text: async () => 'ok',
    } as Response)

    const objectPath = await uploadReportPhoto('client-uuid-123', blob, 'jpg')

    expect(objectPath).toMatch(/^client-uuid-123\/photo-\d+\.jpg$/)
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const [calledUrl, options] = fetchSpy.mock.calls[0] as [string, RequestInit]
    expect(calledUrl).toContain(
      'https://test-project.supabase.co/storage/v1/object/report-photos/client-uuid-123/photo-',
    )
    expect(options.method).toBe('POST')
    expect((options.headers as Record<string, string>)['apikey']).toBe(
      'anon-key-test-1234567890abcdef',
    )
    expect((options.headers as Record<string, string>)['x-upsert']).toBe('true')
  })

  it('выбрасывает ошибку при HTTP статусе не 200', async () => {
    const blob = new Blob(['fake-image-bytes'], { type: 'image/jpeg' })

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Access denied',
    } as Response)

    await expect(uploadReportPhoto('client-uuid-123', blob)).rejects.toThrow(
      'Ошибка загрузки фото: 403',
    )
  })
})
