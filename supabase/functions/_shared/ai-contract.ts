/**
 * Контракт ответа AI-сканера (срез 1). Версия фиксируется в ответе функции,
 * чтобы клиент и промпт можно было менять согласованно.
 *
 * ⚠️ Копия схемы живёт в src/shared/types/ai-contract.ts (браузер не может
 * импортировать из supabase/functions). Меняя контракт — правь оба файла
 * и тест src/shared/types/ai-contract.test.ts.
 */
import { z } from 'npm:zod@4.6.7'

export const CONTRACT_VERSION = '1.0'

/** Уровни отчёта жителя: critical по фото не бывает (см. AGENTS.md). */
export const residentRiskLevelSchema = z.enum(['low', 'medium', 'high'])

export const assessmentSchema = z.object({
  /** Относится ли фото к теме: стена, потолок, пол, подвал, участок у дома. */
  is_relevant: z.boolean(),
  risk_level: residentRiskLevelSchema,
  /** Уверенность модели в оценке, 0…1. */
  confidence: z.number().min(0).max(1),
  /** Что видно на фото — короткие факты без диагнозов. */
  findings: z.array(z.string().trim().min(1).max(240)).max(6),
  /** Что сделать жителю. */
  recommendations: z.array(z.string().trim().min(1).max(240)).max(5),
  /** Дисклеймер: оценка по фото, не измерение. */
  disclaimer: z.string().trim().min(1).max(400),
  /** Режим фермера (P2, за флагом): советы по воде на участке. */
  water_tips: z.array(z.string().trim().min(1).max(240)).max(4).optional(),
})

export type Assessment = z.infer<typeof assessmentSchema>

/**
 * Приводит ответ модели к безопасному виду.
 * Нерелевантное фото не может нести риск: иначе снимок кота попадёт в риск зоны
 * как «высокий» (срез 3 берёт максимум по сигналам).
 */
export function normalizeAssessment(assessment: Assessment): Assessment {
  if (assessment.is_relevant) return assessment
  return { ...assessment, risk_level: 'low' }
}