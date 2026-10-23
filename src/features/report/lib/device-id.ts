/**
 * device_id → SHA-256: сервер видит только хэш, сам UUID остаётся в localStorage.
 * Нужен для лимита «10 отчётов в час с устройства» в `submit-report`.
 */
import { createClientId } from '../../../shared/lib/client-id'

export const DEVICE_ID_KEY = 'suutech.device-id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export type DeviceStorage = Pick<Storage, 'getItem' | 'setItem'>

/**
 * Постоянный идентификатор устройства (не человека). Битое значение в хранилище
 * или приватный режим не должны ломать отправку — тогда создаём новый.
 */
export function readDeviceId(storage: DeviceStorage): string {
  const existing = storage.getItem(DEVICE_ID_KEY)
  if (typeof existing === 'string' && UUID_V4.test(existing)) return existing

  const created = createClientId()
  try {
    storage.setItem(DEVICE_ID_KEY, created)
  } catch {
    // Safari private mode: живём без сохранения, лимит сработает по IP.
  }
  return created
}

export async function hashDeviceId(deviceId: string): Promise<string> {
  const bytes = new TextEncoder().encode(deviceId)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}