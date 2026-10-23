import { describe, expect, it } from 'vitest'
import {
  REPORT_CONTRACT_VERSION,
  WELL_DEPTH_MAX_M,
  photoPathClientId,
  submitReportRequestSchema,
  submitReportResponseSchema,
  type SubmitReportRequest,
} from './report-contract'

const CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const OTHER_CLIENT_ID = '33333333-3333-4333-8333-333333333333'

const payload: SubmitReportRequest = {
  contract_version: REPORT_CONTRACT_VERSION,
  client_id: CLIENT_ID,
  device_hash: 'a'.repeat(64),
  lat: 42.34793,
  lng: 76.1669,
  accuracy_m: 12,
  water_in_basement: true,
  well_depth_m: 1.5,
  photo_path: `reports/${CLIENT_ID}/a1b2c3d4e5f6.jpg`,
  risk_level: 'high',
  confidence: 0.72,
  findings: ['Влажные стены'],
  recommendations: ['Убрать воду из подвала'],
  captured_at: null,
  mode: 'resident',
}

describe('submitReportRequestSchema: тело запроса submit-report', () => {
  it('принимает отчёт с фото из сканера', () => {
    expect(submitReportRequestSchema.safeParse(payload).success).toBe(true)
  })

  it('принимает отчёт без фото и без GPS-точности (пин вручную)', () => {
    const manual = {
      ...payload,
      photo_path: null,
      risk_level: null,
      confidence: null,
      findings: [],
      recommendations: [],
      accuracy_m: null,
    }
    expect(submitReportRequestSchema.safeParse(manual).success).toBe(true)
  })

  it('ловит несовпадение версии контракта', () => {
    const result = submitReportRequestSchema.safeParse({ ...payload, contract_version: '2.0' })
    expect(result.success).toBe(false)
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

  it('держит лимиты полей: глубина, уверенность, точность, списки', () => {
    const tooDeep = submitReportRequestSchema.safeParse({
      ...payload,
      well_depth_m: WELL_DEPTH_MAX_M + 1,
    })
    expect(tooDeep.success).toBe(false)

    expect(submitReportRequestSchema.safeParse({ ...payload, confidence: 1.5 }).success).toBe(false)
    expect(submitReportRequestSchema.safeParse({ ...payload, accuracy_m: -1 }).success).toBe(false)
    expect(submitReportRequestSchema.safeParse({ ...payload, lat: 91 }).success).toBe(false)
    expect(submitReportRequestSchema.safeParse({ ...payload, lng: 181 }).success).toBe(false)
    expect(
      submitReportRequestSchema.safeParse({ ...payload, findings: Array(7).fill('влажно') }).success,
    ).toBe(false)
    expect(
      submitReportRequestSchema.safeParse({ ...payload, recommendations: Array(6).fill('осушить') })
        .success,
    ).toBe(false)
  })

  it('не принимает уровень critical из фото и пустые строки в находках', () => {
    expect(submitReportRequestSchema.safeParse({ ...payload, risk_level: 'critical' }).success).toBe(
      false,
    )
    expect(submitReportRequestSchema.safeParse({ ...payload, findings: ['  '] }).success).toBe(false)
  })

  it('не принимает device_hash не в формате SHA-256', () => {
    expect(submitReportRequestSchema.safeParse({ ...payload, device_hash: 'abc' }).success).toBe(
      false,
    )
    expect(
      submitReportRequestSchema.safeParse({ ...payload, device_hash: 'A'.repeat(64) }).success,
    ).toBe(false)
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