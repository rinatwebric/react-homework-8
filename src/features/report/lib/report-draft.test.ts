import { describe, expect, it } from 'vitest'
import {
  buildSubmitPayload,
  commentLength,
  formatCommentWithRisk,
  getRiskPrefix,
  locationOffsetM,
  submissionBlock,
  type ReportDraft,
} from './report-draft'

const gps = { lat: 42.34793, lng: 76.1669, accuracyM: 12 }

const draft: ReportDraft = {
  clientId: '22222222-2222-4222-8222-222222222222',
  deviceHash: 'a'.repeat(64),
  category: 'basement_water',
  comment: 'Вода в подвале с ночи',
  immediateDanger: false,
  point: { lat: 42.3481, lng: 76.1672 },
  gps,
  photoPath: null,
}

describe('commentLength: символы, а не UTF-16', () => {
  it('считает эмодзи за один символ, как char_length в Postgres', () => {
    expect(commentLength('вода')).toBe(4)
    expect(commentLength('💧')).toBe(1)
    expect(commentLength('💧💧')).toBe(2)
  })
})

describe('formatCommentWithRisk: форматирование с префиксом риска', () => {
  it('возвращает корректные префиксы для каждого уровня риска', () => {
    expect(getRiskPrefix('critical')).toBe('[Критический риск / ЧС]')
    expect(getRiskPrefix('elevated')).toBe('[Высокий риск]')
    expect(getRiskPrefix('moderate')).toBe('[Умеренный риск]')
  })

  it('для пустого комментария возвращает только префикс', () => {
    expect(formatCommentWithRisk('', 'moderate')).toBe('[Умеренный риск]')
    expect(formatCommentWithRisk('   ', 'elevated')).toBe('[Высокий риск]')
    expect(formatCommentWithRisk('', 'critical')).toBe('[Критический риск / ЧС]')
  })

  it('добавляет префикс к обычному комментарию', () => {
    const res = formatCommentWithRisk('Вода в подвале', 'critical')
    expect(res).toBe('[Критический риск / ЧС] Вода в подвале')
  })

  it('обрезает текст так, чтобы суммарная длина никогда не превышала 500 символов', () => {
    const longText = 'а'.repeat(550)
    const formatted = formatCommentWithRisk(longText, 'critical')

    expect(commentLength(formatted)).toBeLessThanOrEqual(500)
    expect(submissionBlock({ ...draft, comment: formatted })).toBeNull()
  })

  it('корректно работает с эмодзи в длинном тексте', () => {
    const emojiText = '💧'.repeat(490)
    const formatted = formatCommentWithRisk(emojiText, 'elevated')

    expect(commentLength(formatted)).toBeLessThanOrEqual(500)
    expect(submissionBlock({ ...draft, comment: formatted })).toBeNull()
  })
})

describe('locationOffsetM: сдвиг метки от GPS', () => {
  it('без точки или без GPS — null', () => {
    expect(locationOffsetM({ point: null, gps })).toBeNull()
    expect(locationOffsetM({ point: draft.point, gps: null })).toBeNull()
  })

  it('совпадающие точки — ноль', () => {
    expect(locationOffsetM({ point: { lat: gps.lat, lng: gps.lng }, gps })).toBe(0)
  })

  it('0,001° по широте — около 111 м', () => {
    const offset = locationOffsetM({ point: { lat: 42.34893, lng: 76.1669 }, gps })
    expect(offset).toBeGreaterThan(110)
    expect(offset).toBeLessThan(112)
  })
})

describe('submissionBlock: чего не хватает для отправки', () => {
  it('всё заполнено — блокировки нет', () => {
    expect(submissionBlock(draft)).toBeNull()
  })

  it('нет координат — блокирует', () => {
    expect(submissionBlock({ ...draft, point: null })).toBe('location')
  })

  it('нет GPS-фикса — блокирует с отдельной причиной', () => {
    // Метка вручную не заменяет геопозицию (§7): причина `gps`, а не `location`.
    expect(submissionBlock({ ...draft, gps: null })).toBe('gps')
  })

  it('категория не выбрана — блокирует', () => {
    expect(submissionBlock({ ...draft, category: null })).toBe('category')
  })

  it('комментарий длиннее 500 символов — блокирует', () => {
    expect(submissionBlock({ ...draft, comment: 'а'.repeat(501) })).toBe('comment')
    expect(submissionBlock({ ...draft, comment: 'а'.repeat(500) })).toBeNull()
  })

  it('пин унесён дальше 300 м — блокирует', () => {
    // 0,003° по широте ≈ 333 м.
    expect(submissionBlock({ ...draft, point: { lat: 42.35093, lng: 76.1669 } })).toBe('pin_far')
  })

  it('пин в пределах 300 м — не блокирует', () => {
    expect(submissionBlock({ ...draft, point: { lat: 42.3499, lng: 76.1669 } })).toBeNull()
  })
})

describe('buildSubmitPayload: тело запроса v2.0', () => {
  it('собирает контракт без фото', () => {
    const result = buildSubmitPayload(draft)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload).toEqual({
      contract_version: '2.0',
      client_id: draft.clientId,
      device_hash: draft.deviceHash,
      category: 'basement_water',
      comment: 'Вода в подвале с ночи',
      immediate_danger: false,
      point: draft.point,
      gps: { lat: gps.lat, lng: gps.lng, accuracy_m: gps.accuracyM },
      photo_path: null,
      weather_snapshot: null,
    })
  })

  it('пустой комментарий уходит как null', () => {
    const result = buildSubmitPayload({ ...draft, comment: '   ' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.comment).toBeNull()
  })

  it('обрезает пробелы по краям комментария', () => {
    const result = buildSubmitPayload({ ...draft, comment: '  вода у стены  ' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.comment).toBe('вода у стены')
  })

  it('переносит отметку «опасно для жизни»', () => {
    const result = buildSubmitPayload({ ...draft, immediateDanger: true })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.immediate_danger).toBe(true)
  })

  it('переносит путь фото, приложенного к заявке', () => {
    const result = buildSubmitPayload({
      ...draft,
      photoPath: '22222222-2222-4222-8222-222222222222/6f1d7a5e-0000-4000-8000-000000000000.jpg',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.photo_path).toBe(
      '22222222-2222-4222-8222-222222222222/6f1d7a5e-0000-4000-8000-000000000000.jpg',
    )
  })

  it('не пропускает путь фото с чужим client_id', () => {
    const result = buildSubmitPayload({
      ...draft,
      photoPath: '33333333-3333-4333-8333-333333333333/6f1d7a5e-0000-4000-8000-000000000000.jpg',
    })
    expect(result).toEqual({ ok: false, reason: 'invalid' })
  })

  it('переносит weather_snapshot, если он приложен к заявке', () => {
    const snapshot = {
      captured_at: '2026-10-24T12:00:00.000Z',
      temperature_c: 12.5,
      precipitation_mm: 1.2,
      humidity_pct: 75,
    }
    const result = buildSubmitPayload({
      ...draft,
      weatherSnapshot: snapshot,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.weather_snapshot).toEqual(snapshot)
  })

  it('оставляет weather_snapshot = null, если погода недоступна', () => {
    const result = buildSubmitPayload({
      ...draft,
      weatherSnapshot: null,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.payload.weather_snapshot).toBeNull()
  })

  it('возвращает причину блокировки вместо мусора', () => {
    expect(buildSubmitPayload({ ...draft, category: null })).toEqual({
      ok: false,
      reason: 'category',
    })
    expect(buildSubmitPayload({ ...draft, point: null })).toEqual({
      ok: false,
      reason: 'location',
    })
    expect(buildSubmitPayload({ ...draft, gps: null })).toEqual({ ok: false, reason: 'gps' })
  })
})