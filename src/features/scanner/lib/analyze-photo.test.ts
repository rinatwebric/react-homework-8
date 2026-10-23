import { describe, expect, it } from 'vitest'
import { AnalyzeError, mapFailure, parseAnalyzeResponse } from './analyze-photo'

const ASSESSMENT = {
  is_relevant: true,
  risk_level: 'high',
  confidence: 0.81,
  findings: ['Вода на полу у стены'],
  recommendations: ['Отвести воду от фундамента'],
  disclaimer: 'Оценка по фото, не измерение.',
}

describe('analyze-photo: ошибки функции → понятный код', () => {
  it('берёт код сервера, если он известен клиенту', () => {
    const error = mapFailure(429, { code: 'RATE_LIMITED', message: 'Слишком много фото' })
    expect(error).toBeInstanceOf(AnalyzeError)
    expect(error.code).toBe('RATE_LIMITED')
    expect(error.message).toBe('Слишком много фото')
  })

  it('подставляет код по HTTP-статусу, если тело не JSON', () => {
    expect(mapFailure(413, null).code).toBe('FILE_TOO_LARGE')
    expect(mapFailure(415, null).code).toBe('UNSUPPORTED_MEDIA')
    expect(mapFailure(504, null).code).toBe('AI_TIMEOUT')
    expect(mapFailure(502, null).code).toBe('AI_INVALID')
    expect(mapFailure(500, null).code).toBe('SERVER')
  })

  it('не доверяет незнакомому коду', () => {
    expect(mapFailure(400, { code: 'TEAPOT' }).code).toBe('INVALID_INPUT')
  })

  it('401/403 — это ошибка настройки ключа, а не вина пользователя', () => {
    expect(mapFailure(401, null).code).toBe('NOT_CONFIGURED')
    expect(mapFailure(403, null).code).toBe('NOT_CONFIGURED')
  })
})

describe('analyze-photo: разбор успешного ответа', () => {
  it('отдаёт оценку, путь к фото и признак кэша', () => {
    const result = parseAnalyzeResponse({
      assessment: ASSESSMENT,
      photo_path: 'reports/abc/0123456789ab.jpg',
      model: 'gemini-3.5-flash-lite',
      cached: true,
      contract_version: '1.0',
    })

    expect(result.assessment.risk_level).toBe('high')
    expect(result.photoPath).toBe('reports/abc/0123456789ab.jpg')
    expect(result.cached).toBe(true)
  })

  it('падает с AI_INVALID на чужом формате', () => {
    expect(() => parseAnalyzeResponse({ ok: true })).toThrowError(AnalyzeError)
  })
})