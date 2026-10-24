/**
 * Контекст перехода «сканер → отчёт»: что экран сканера передаёт форме через
 * react-router state. Обе стороны валидируют его zod — state можно подделать
 * или потерять при перезагрузке, поэтому parse на входе обязателен.
 *
 * v2.0: форме нужны только `clientId` (id заявки = папка фото) и `photoPath`.
 * `riskLevel`/`findings`/`recommendations` остаются, пока жив экран сканера
 * (удаляется в PR-5): форма их не читает и в заявку не отправляет — AI-оценка
 * видна только модератору (§8).
 */
import { z } from 'zod'
import { residentRiskLevelSchema } from './ai-contract'
import { photoPathSchema } from './report-contract'

export const reportContextSchema = z.object({
  /** client_id скана: по нему сформирован путь фото, он же станет id заявки. */
  clientId: z.uuid(),
  photoPath: photoPathSchema.nullable(),
  riskLevel: residentRiskLevelSchema.nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  findings: z.array(z.string().trim().min(1).max(240)).max(6),
  recommendations: z.array(z.string().trim().min(1).max(240)).max(5),
})

export type ReportContext = z.infer<typeof reportContextSchema>

/** Что v2-форма реально берёт из контекста. */
export type ReportPhotoContext = Pick<ReportContext, 'clientId' | 'photoPath'>

/** Мягкий разбор: нет контекста (прямой заход на /report) — отчёт без фото. */
export function readReportContext(value: unknown): ReportPhotoContext | null {
  const parsed = reportContextSchema.safeParse(value)
  if (!parsed.success) return null
  return { clientId: parsed.data.clientId, photoPath: parsed.data.photoPath }
}