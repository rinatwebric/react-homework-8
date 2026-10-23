import { describe, expect, it } from 'vitest'
import { mapSubmitFailure, parseSubmitResponse, SubmitReportError } from './submit-report'

describe('submit-report: разбор ошибок сервера', () => {
  it('берёт код из тела ответа', () => {
    const error = mapSubmitFailure(400, { code: 'INVALID_INPUT', message: 'Нет координат' })
    expect(error.code).toBe('INVALID_INPUT')
    expect(error.message).toBe('Нет координат')
  })

  it('429 — лимит частоты', () => {
    expect(mapSubmitFailure(429, null).code).toBe('RATE_LIMITED')
  })

  it('неизвестный код в теле подменяется кодом по статусу', () => {
    expect(mapSubmitFailure(400, { code: 'SOMETHING_ELSE' }).code).toBe('INVALID_INPUT')
  })

  it('5xx и 502 без тела — ошибка сервера', () => {
    expect(mapSubmitFailure(502, null).code).toBe('SERVER')
    expect(mapSubmitFailure(503, 'not json').code).toBe('SERVER')
  })

  it('вернул типизированную ошибку', () => {
    expect(mapSubmitFailure(400, null)).toBeInstanceOf(SubmitReportError)
  })
})

describe('submit-report: разбор успешного ответа', () => {
  it('читает id и признак дубля', () => {
    const response = parseSubmitResponse({
      id: '22222222-2222-4222-8222-222222222222',
      duplicate: false,
    })
    expect(response).toEqual({ id: '22222222-2222-4222-8222-222222222222', duplicate: false })
  })

  it('битый ответ — ошибка сервера, а не пустой экран', () => {
    expect(() => parseSubmitResponse({ id: 'не-uuid' })).toThrow(SubmitReportError)
  })
})