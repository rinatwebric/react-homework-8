import {
  RESIDENT_RISK_LEVELS,
  RISK_LEVELS,
  type ResidentRiskLevel,
  type RiskLevel,
} from '../../config/risk'

/** Порядок уровней: чем больше, тем хуже. Нужен для правил зоны (срез 3). */
export const RISK_ORDER: Record<RiskLevel, number> = {
  normal: 0,
  elevated: 1,
  high: 2,
  critical: 3,
}

export function isRiskLevel(value: unknown): value is RiskLevel {
  return typeof value === 'string' && (RISK_LEVELS as readonly string[]).includes(value)
}

export function isResidentRiskLevel(value: unknown): value is ResidentRiskLevel {
  return typeof value === 'string' && (RESIDENT_RISK_LEVELS as readonly string[]).includes(value)
}

/**
 * AI оценивает фото по шкале low | medium | high — это отчёт жителя.
 * Уровня critical по фото не бывает: его дают только правила зоны/датчиков.
 */
const RESIDENT_TO_ZONE: Record<ResidentRiskLevel, RiskLevel> = {
  low: 'normal',
  medium: 'elevated',
  high: 'high',
}

export function toZoneRisk(level: ResidentRiskLevel): RiskLevel {
  return RESIDENT_TO_ZONE[level]
}

/** Худший из уровней (риск зоны — максимум по всем сигналам). */
export function worstRisk(levels: readonly RiskLevel[]): RiskLevel {
  let worst: RiskLevel = 'normal'
  for (const level of levels) {
    if (RISK_ORDER[level] > RISK_ORDER[worst]) worst = level
  }
  return worst
}

/** Уровни, о которых нужно предупреждать жителей и службы. */
export function isAlertable(level: RiskLevel): boolean {
  return RISK_ORDER[level] >= RISK_ORDER.elevated
}