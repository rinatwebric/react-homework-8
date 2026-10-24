import { describe, expect, it } from 'vitest'
import { isJwtExpired } from './admin-api'

describe('isJwtExpired: проверка срока действия JWT токена', () => {
  function makeJwt(expSeconds: number): string {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ exp: expSeconds, sub: 'user-1' }))
    const signature = 'fake-sig'
    return `${header}.${payload}.${signature}`
  }

  it('считает null или пустой токен истекшим', () => {
    expect(isJwtExpired(null)).toBe(true)
    expect(isJwtExpired(undefined)).toBe(true)
    expect(isJwtExpired('')).toBe(true)
    expect(isJwtExpired('invalid-token')).toBe(true)
  })

  it('считает токен с exp в прошлом истекшим', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 300 // 5 минут назад
    const token = makeJwt(pastExp)
    expect(isJwtExpired(token)).toBe(true)
  })

  it('считает токен с запасом времени действующим', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600 // через 1 час
    const token = makeJwt(futureExp)
    expect(isJwtExpired(token)).toBe(false)
  })

  it('считает токен, истекающий менее чем через 30 секунд, истекшим для безопасности', () => {
    const expiringSoon = Math.floor(Date.now() / 1000) + 15 // через 15 секунд
    const token = makeJwt(expiringSoon)
    expect(isJwtExpired(token)).toBe(true)
  })
})
