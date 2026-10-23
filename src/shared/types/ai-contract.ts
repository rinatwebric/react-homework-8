/**
 * Контракт ответа AI-сканера на стороне клиента.
 *
 * ⚠️ Копия схемы из supabase/functions/_shared/ai-contract.ts: браузер не может
 * импортировать код Edge Functions. Меняя контракт, правь оба файла — тест
 * src/shared/types/ai-contract.test.ts держит их согласованными по смыслу.
 */
import { z } from 'zod'

export const residentRiskLevelSchema = z.enum(['low', 'medium', 'high'])

export const assessmentSchema = z.object({
  /** Относится ли фото к теме: стена, потолок, пол, подвал, участок у дома. */
  is_relevant: z.boolean(),
  risk_level: residentRiskLevelSchema,
  /** Уверенность модели, 0…1. */
  confidence: z.number().min(0).max(1),
  findings: z.array(z.string().trim().min(1).max(240)).max(6),
  recommendations: z.array(z.string().trim().min(1).max(240)).max(5),
  disclaimer: z.string().trim().min(1).max(400),
  /** Советы по воде на участке — только режим фермера (P2). */
  water_tips: z.array(z.string().trim().min(1).max(240)).max(4).optional(),
})

export type Assessment = z.infer<typeof assessmentSchema>

/** Ответ Edge Function `analyze-photo`. */
export const analyzeResponseSchema = z.object({
  assessment: assessmentSchema,
  photo_path: z.string().nullable(),
  model: z.string().nullable(),
  cached: z.boolean(),
  contract_version: z.string(),
})

export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>