import { describe, expect, it } from 'vitest'
import { buildSubmitPayload, parseWellDepth, submissionBlock, type ReportDraft } from './report-draft'

const draft: ReportDraft = {
  clientId: '22222222-2222-4222-8222-222222222222',
  deviceHash: 'a'.repeat(64),
  point: { lat: 42.34793, lng: 76.1669 },
  accuracyM: 12,
  waterInBasement: true,
  wellDepthRaw: '1,5',
  gpsOffsetM: 0,
  photo: null,
}

describe('parseWellDepth: глубина колодца', () => {
  it('пустое поле — «не знаю»', () => {
    expect(parseWellDepth('')).toEqual({ ok: true, value: null })
    expect(parseWellDepth('   ')).toEqual({ ok: true, value: null })
  })

  it('принимает запятую и точку', () => {
    expect(parseWellDepth('1,5')).toEqual({ ok: true, value: 1.5 })
    expect(parseWellDepth('2.25')).toEqual({ ok: true, value: 2.3 })
  })

  it('округляет до 0.1 м', () => {
    expect(parseWellDepth('0.04')).toEqual({ ok: true, value: 0 })
  })

  it('ноль — допустимое значение', () => {
    expect(parseWellDepth('0')).toEqual({ ok: true, value: 0 })
  })

  it('текст — не число', () => {
    expect(parseWellDepth('глубоко')).toEqual({ ok: false, error: 'not_number' })
    expect(parseWellDepth('1.5 м')).toEqual({ ok: false, error: 'not_number' })
  })

  it('отрицательная глубина отклоняется', () => {
    expect(parseWellDepth('-1')).toEqual({ ok: false, error: 'negative' })
  })

  it('больше 50 м отклоняется', () => {
    expect(parseWellDepth('51')).toEqual({ ok: false, error: 'too_deep' })
  })
})

describe('submissionBlock: чего не хватает для отправки', () => {
  it('всё заполнено — блокировки нет', () => {
    expect(submissionBlock(draft)).toBeNull()
  })

  it('нет координат — блокирует', () => {
    expect(submissionBlock({ ...draft, point: null, accuracyM: null })).toBe('location')
  })

  it('не отвечено про подвал — блокирует', () => {
    expect(submissionBlock({ ...draft, waterInBasement: null })).toBe('basement')
  })

  it('глубина не число — блокирует', () => {
    expect(submissionBlock({ ...draft, wellDepthRaw: 'abc' })).toBe('well_depth')
  })

  it('пин унесён дальше 2 км — блокирует', () => {
    expect(submissionBlock({ ...draft, gpsOffsetM: 2_500 })).toBe('pin_far')
  })

  it('пин в пределах 2 км — не блокирует', () => {
    expect(submissionBlock({ ...draft, gpsOffsetM: 1_999 })).toBeNull()
  })
})

describe('buildSubmitPayload: тело запроса', () => {
  it('собирает контракт без фото', () => {
    const result = buildSubmitPayload(draft)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload).toMatchObject({
      client_id: draft.clientId,
      lat: 42.34793,
      lng: 76.1669,
      accuracy_m: 12,
      water_in_basement: true,
      well_depth_m: 1.5,
      photo_path: null,
      risk_level: null,
      findings: [],
      captured_at: null,
      mode: 'resident',
    })
  })

  it('переносит AI-оценку из сканера', () => {
    const result = buildSubmitPayload({
      ...draft,
      waterInBasement: false,
      wellDepthRaw: '',
      photo: {
        photoPath: '22222222-2222-4222-8222-222222222222/6f1d7a5e-0000-4000-8000-000000000000.jpg',
        riskLevel: 'high',
        confidence: 0.82,
        findings: ['Тёмное пятно у плинтуса'],
        recommendations: ['Проветрить помещение'],
      },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload).toMatchObject({
      water_in_basement: false,
      well_depth_m: null,
      risk_level: 'high',
      confidence: 0.82,
      findings: ['Тёмное пятно у плинтуса'],
      photo_path: '22222222-2222-4222-8222-222222222222/6f1d7a5e-0000-4000-8000-000000000000.jpg',
    })
  })

  it('не пропускает путь фото с чужим client_id', () => {
    const result = buildSubmitPayload({
      ...draft,
      photo: {
        photoPath: '33333333-3333-4333-8333-333333333333/6f1d7a5e-0000-4000-8000-000000000000.jpg',
        riskLevel: 'high',
        confidence: 0.8,
        findings: [],
        recommendations: [],
      },
    })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('возвращает причину блокировки вместо мусора', () => {
    expect(buildSubmitPayload({ ...draft, waterInBasement: null })).toEqual({
      ok: false,
      reason: 'basement',
    })
  })
})