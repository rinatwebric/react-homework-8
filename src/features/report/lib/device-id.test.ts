import { describe, expect, it } from 'vitest'
import { DEVICE_ID_KEY, hashDeviceId, readDeviceId, type DeviceStorage } from './device-id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

function memoryStorage(initial: Record<string, string> = {}, denyWrite = false): DeviceStorage {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      if (denyWrite) throw new Error('QuotaExceededError')
      data.set(key, value)
    },
  }
}

describe('device-id: идентификатор устройства', () => {
  it('создаёт и сохраняет UUID v4', () => {
    const storage = memoryStorage()
    const deviceId = readDeviceId(storage)
    expect(deviceId).toMatch(UUID_V4)
    expect(storage.getItem(DEVICE_ID_KEY)).toBe(deviceId)
  })

  it('возвращает сохранённый идентификатор', () => {
    const saved = '11111111-1111-4111-8111-111111111111'
    expect(readDeviceId(memoryStorage({ [DEVICE_ID_KEY]: saved }))).toBe(saved)
  })

  it('битое значение в хранилище заменяет новым', () => {
    const storage = memoryStorage({ [DEVICE_ID_KEY]: 'не-uuid' })
    expect(readDeviceId(storage)).toMatch(UUID_V4)
  })

  it('приватный режим без записи не ломает отправку', () => {
    expect(readDeviceId(memoryStorage({}, true))).toMatch(UUID_V4)
  })
})

describe('device-id: хэш', () => {
  it('SHA-256 от строки', async () => {
    // Известный вектор: sha256("abc")
    expect(await hashDeviceId('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('хэш — 64 hex-символа', async () => {
    expect(await hashDeviceId('11111111-1111-4111-8111-111111111111')).toMatch(/^[0-9a-f]{64}$/)
  })
})