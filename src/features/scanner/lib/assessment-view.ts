import { LOW_CONFIDENCE } from '../../../config/ai'
import type { RiskLevel } from '../../../config/risk'
import { toZoneRisk } from '../../../shared/lib/risk'
import type { Assessment } from '../../../shared/types/ai-contract'

/**
 * Что показать по ответу AI. Чистая функция — покрыта тестами.
 * Нерелевантное фото (кот, документ, еда) не должно выглядеть как оценка дома,
 * а низкая уверенность — как приговор стене.
 */
export type AssessmentOutcome = 'relevant' | 'irrelevant' | 'low_confidence'

export type AssessmentView = {
  outcome: AssessmentOutcome
  /** Уровень риска зоны (normal | elevated | high) для RiskBadge/RiskScale. */
  zoneLevel: RiskLevel
  confidencePercent: number
}

export function buildAssessmentView(
  assessment: Assessment,
  lowConfidence = LOW_CONFIDENCE,
): AssessmentView {
  const outcome: AssessmentOutcome = !assessment.is_relevant
    ? 'irrelevant'
    : assessment.confidence < lowConfidence
      ? 'low_confidence'
      : 'relevant'

  const percent = Math.round(assessment.confidence * 100)

  return {
    outcome,
    zoneLevel: toZoneRisk(assessment.risk_level),
    confidencePercent: Math.min(100, Math.max(0, percent)),
  }
}