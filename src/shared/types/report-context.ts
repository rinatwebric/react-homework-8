/**
 * Контекст перехода «сканер → отчёт»: что экран сканера передаёт форме через
 * react-router state. Обе стороны валидируют его zod — state можно подделать
 * или потерять при перезагрузке, поэтому parse на входе обязателен.
 */
import { z } from 'zod'
import { residentRiskLevelSchema } from './ai-contract'
import { photoPathSchema } from './report-contract'

export const reportContextSchema = z.object({
  photoPath: photoPathSchema.nullable(),
  riskLevel: residentRiskLevelSchema.nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  findings: z.array(z.string().trim().min(1).max(240)).max(6),
  recommendations: z.array(z.string().trim().min(1).max(240)).max(5),
})

export type ReportContext = z.infer<typeof reportContextSchema>

/** Мягкий разбор: нет контекста (прямой заход на /report) — отчёт без фото. */
export function readReportContext(value: unknown): ReportContext | null {
  const parsed = reportContextSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}