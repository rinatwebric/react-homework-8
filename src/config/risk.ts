/**
 * Единая шкала риска проекта (AGENTS.md):
 * зона / датчик / погода → normal | elevated | high | critical;
 * отчёт жителя (AI) → low | medium | high.
 *
 * Пороговые значения (погода, датчики) появятся в срезе 3 в конфиге и будут
 * помечены как стартовые: калибруются на данных пилота.
 */
export const RISK_LEVELS = ['normal', 'elevated', 'high', 'critical'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const RESIDENT_RISK_LEVELS = ['low', 'medium', 'high'] as const
export type ResidentRiskLevel = (typeof RESIDENT_RISK_LEVELS)[number]