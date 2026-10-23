import { describe, expect, it } from 'vitest'
import { createClientId } from './client-id'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('client-id: идентификатор устройства для лимитов', () => {
  it('возвращает UUID v4', () => {
    expect(createClientId()).toMatch(UUID_V4)
  })

  it('не повторяется', () => {
    expect(createClientId()).not.toBe(createClientId())
  })
})