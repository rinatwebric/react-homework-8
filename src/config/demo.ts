import type { RiskLevel } from './risk'

/**
 * Демонстрационные данные срезов 0–3 (тексты — ключи из src/locales).
 * Каждое место использования подписано компонентом DemoTag: симуляция и
 * демо-данные всегда подписаны, выдавать их за измерения нельзя (AGENTS.md).
 */

/** Риск села «сегодня»: в срезе 3 придёт из compute-zone-risk. */
export const DEMO_HOME: { level: RiskLevel } = {
  level: 'elevated',
}

/** Ответ AI-сканера: в срезе 1 придёт из analyze-photo. */
export const DEMO_REPORT: { level: RiskLevel; steps: readonly string[] } = {
  level: 'elevated',
  steps: ['scan.steps.dry', 'scan.steps.drain', 'scan.steps.repeat'],
}

/** Легенда карты: те же уровни, что в риск-шкале проекта. */
export const DEMO_MAP: {
  sheetLevel: RiskLevel
  legend: readonly ('normal' | 'elevated' | 'high')[]
} = {
  sheetLevel: 'high',
  legend: ['normal', 'elevated', 'high'],
}

/** Уровень воды по дням, 0…1 — высота столбика. */
export const DEMO_WATER_WEEK = [
  { day: 'mon', value: 0.42 },
  { day: 'tue', value: 0.5 },
  { day: 'wed', value: 0.56 },
  { day: 'thu', value: 0.74 },
  { day: 'fri', value: 0.68 },
  { day: 'sat', value: 0.44 },
  { day: 'sun', value: 0.38 },
] as const

/** Сводка для /admin: реальные цифры появятся после среза 4. */
export const DEMO_ADMIN: {
  stats: readonly { id: 'reports' | 'zones' | 'roads' | 'wells'; value: number }[]
  requests: readonly { id: 'central' | 'field' | 'canal'; level: RiskLevel }[]
} = {
  stats: [
    { id: 'reports', value: 128 },
    { id: 'zones', value: 14 },
    { id: 'roads', value: 9 },
    { id: 'wells', value: 21 },
  ],
  requests: [
    { id: 'central', level: 'high' },
    { id: 'field', level: 'elevated' },
    { id: 'canal', level: 'elevated' },
  ],
}