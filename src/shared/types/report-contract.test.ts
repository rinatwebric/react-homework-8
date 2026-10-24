import { describe, expect, it } from 'vitest'
import {
  COMMENT_MAX_LENGTH,
  MAX_LOCATION_ADJUST_M,
  REPORT_CONTRACT_VERSION,
  photoPathClientId,
  submitReportRequestSchema,
  submitReportResponseSchema,
  type SubmitReportRequest,
} from './report-contract'

const CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_CLIENT_ID = '33333333-3333-4333-8333-333333333333'

const gps = { lat: 42.34793, lng: 76.1669, accuracy_m: 12 }

const payload: SubmitReportRequest = {
  contract_version: REPORT_CONTRACT_VERSION,
  client_id: CLIENT_ID,
  device_hash: 'a'.repeat(64),
  category: 'basement_water',
  comment: 'Вода в подвале с ночи',
  immediate_danger: false,
  point: { lat: 42.3481, lng: 76.1672 },
  gps,
  photo_path: `reports/${CLIENT_ID}/a1b2c3d4e5f6.jpg`,
  weather_snapshot: null,
}

describe('submitReportRequestSchema: тело запроса submit-report v2.0', () => {
  it('принимает заявку с фото и комментарием', () => {
    expect(submitReportRequestSchema.safeParse(payload).success).toBe(true)
  })

  it('принимает заявку без фото и без комментария', () => {
    const minimal = { ...payload, comment: null, photo_path: null }
    expect(submitReportRequestSchema.safeParse(minimal).success).toBe(true)
  })

  it('принимает снимок погоды в момент заявки', () => {
    const withWeather = {
      ...payload,
      weather_snapshot: {
        captured_at: '2026-10-24T09:00:00.000Z',
        temperature_c: 4.5,
        precipitation_mm: 12,
        humidity_pct: 94,
      },
    }
    expect(submitReportRequestSchema.safeParse(withWeather).success).toBe(true)
  })

  it('ловит несовпадение версии контракта', () => {
    expect(
      submitReportRequestSchema.safeParse({ ...payload, contract_version: '1.0' }).success,
    ).toBe(false)
  })

  it('требует категорию из словаря', () => {
    expect(submitReportRequestSchema.safeParse({ ...payload, category: 'flood' }).success).toBe(false)
    expect(submitReportRequestSchema.safeParse({ ...payload, category: undefined }).success).toBe(
      false,
    )
  })

  it('не даёт привязать чужое фото к своему отчёту', () => {
    const result = submitReportRequestSchema.safeParse({
      ...payload,
      photo_path: `reports/${OTHER_CLIENT_ID}/a1b2c3d4e5f6.jpg`,
    })
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0]?.path).toEqual(['photo_path'])
  })

  it('не принимает путь фото вне формата бакета', () => {
    for (const photoPath of ['../secret.jpg', 'a1b2c3d4e5f6.jpg', 'reports/x/y.jpg', "reports/a'b.jpg"]) {
      expect(submitReportRequestSchema.safeParse({ ...payload, photo_path: photoPath }).success).toBe(
        false,
      )
    }
  })

  it('пускает метку в пределах 300 м и режет дальше', () => {
    // 0,001° по широте ≈ 111 м.
    const near = submitReportRequestSchema.safeParse({
      ...payload,
      gps: { lat: 42.348, lng: 76.167, accuracy_m: 10 },
      point: { lat: 42.3499, lng: 76.167 },
    })
    expect(near.success).toBe(true)

    const far = submitReportRequestSchema.safeParse({
      ...payload,
      gps: { lat: 42.348, lng: 76.167, accuracy_m: 10 },
      point: { lat: 42.353, lng: 76.167 },
    })
    expect(far.success).toBe(false)
    if (far.success) return
    expect(far.error.issues.some((issue) => issue.path[0] === 'point')).toBe(true)
  })

  it('держит лимит комментария и не пускает пустую строку', () => {
    expect(
      submitReportRequestSchema.safeParse({ ...payload, comment: 'а'.repeat(COMMENT_MAX_LENGTH) })
        .success,
    ).toBe(true)
    expect(
      submitReportRequestSchema.safeParse({ ...payload, comment: 'а'.repeat(COMMENT_MAX_LENGTH + 1) })
        .success,
    ).toBe(false)
    expect(submitReportRequestSchema.safeParse({ ...payload, comment: '   ' }).success).toBe(false)
  })

  it('держит границы координат и точности', () => {
    expect(submitReportRequestSchema.safeParse({ ...payload, point: { lat: 91, lng: 76 } }).success).toBe(
      false,
    )
    expect(
      submitReportRequestSchema.safeParse({ ...payload, gps: { ...gps, lng: 181 } }).success,
    ).toBe(false)
    expect(
      submitReportRequestSchema.safeParse({ ...payload, gps: { ...gps, accuracy_m: -1 } }).success,
    ).toBe(false)
  })

  it('не принимает device_hash не в формате SHA-256', () => {
    expect(submitReportRequestSchema.safeParse({ ...payload, device_hash: 'abc' }).success).toBe(false)
    expect(
      submitReportRequestSchema.safeParse({ ...payload, device_hash: 'A'.repeat(64) }).success,
    ).toBe(false)
  })

  it('держит радиус сдвига и лимит комментария в константах', () => {
    expect(MAX_LOCATION_ADJUST_M).toBe(300)
    expect(COMMENT_MAX_LENGTH).toBe(500)
  })
})

describe('photoPathClientId: чей это файл', () => {
  it('достаёт client_id из пути с префиксом и без', () => {
    expect(photoPathClientId(`reports/${CLIENT_ID}/abc.jpg`)).toBe(CLIENT_ID)
    expect(photoPathClientId(`${CLIENT_ID}/abc.jpg`)).toBe(CLIENT_ID)
  })

  it('не угадывает владельца по мусору', () => {
    expect(photoPathClientId('reports/2026/abc.jpg')).toBeNull()
    expect(photoPathClientId('')).toBeNull()
  })
})

describe('submitReportResponseSchema: ответ функции', () => {
  it('принимает id и признак дубля', () => {
    const id = '44444444-4444-4444-8444-444444444444'
    expect(submitReportResponseSchema.safeParse({ id, duplicate: false }).success).toBe(true)
    expect(submitReportResponseSchema.safeParse({ id, duplicate: true }).success).toBe(true)
  })

  it('без duplicate или с не-uuid id ответ считается битым', () => {
    expect(submitReportResponseSchema.safeParse({ id: 'not-a-uuid', duplicate: false }).success).toBe(
      false,
    )
    expect(submitReportResponseSchema.safeParse({ id: CLIENT_ID }).success).toBe(false)
  })
})