import { z } from 'zod'
import { REPORT_CATEGORIES, URGENCY_LEVELS } from '../lib/categories'

/**
 * Контракт AI-триажа для админки (ТЗ v2.0 §8, §12).
 *
 * Синхронизируется с supabase/functions/_shared/triage-contract.ts.
 */
export const TriageSchema = z.object({
  category: z.enum(REPORT_CATEGORIES),
  urgency: z.enum(URGENCY_LEVELS),
  summary: z.string().min(1).max(200),
  recommended_action: z.string().min(1).max(160),
  duplicate_group: z.string().max(64).nullable(),
  confidence: z.number().min(0).max(1),
  needs_human_review: z.boolean(),
})

export type TriageResult = z.infer<typeof TriageSchema>

export const ClassifyReportRequestSchema = z.object({
  report_id: z.string().uuid(),
  lang: z.enum(['ru', 'ky']).default('ru'),
})

export type ClassifyReportRequest = z.infer<typeof ClassifyReportRequestSchema>
