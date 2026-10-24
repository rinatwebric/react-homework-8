import { describe, expect, it } from 'vitest'
import { readSupabaseConfig } from './supabase'

describe('supabase: конфиг из env', () => {
  it('принимает URL и публичный ключ', () => {
    const config = readSupabaseConfig({
      url: 'https://abcd.supabase.co',
      anonKey: 'sb_publishable_1234567890abcdef',
    })
    expect(config?.url).toBe('https://abcd.supabase.co')
  })

  it('без переменных возвращает null (клиент скажет «не настроен»)', () => {
    expect(readSupabaseConfig({})).toBeNull()
  })

  it('не принимает мусор вместо URL', () => {
    expect(readSupabaseConfig({ url: 'not-a-url', anonKey: 'x'.repeat(30) })).toBeNull()
  })

  it('не принимает короткий ключ', () => {
    expect(readSupabaseConfig({ url: 'https://abcd.supabase.co', anonKey: 'short' })).toBeNull()
  })
})