/**
 * Словарь категорий и срочности — серверная сторона (ТЗ v2.0 §7, §12).
 *
 * ⚠️ Копия значений из src/shared/lib/categories.ts (Deno не может импортировать
 * код приложения). Иконки и цвета остаются во фронте; здесь только строки, которые
 * проверяются схемой и CHECK-констрейнтом `reports_category_user_check`.
 * Тест src/shared/lib/categories.test.ts сравнивает оба списка с этим файлом.
 */

/** Категории заявки. Порядок совпадает с формой — частые сверху. */
export const REPORT_CATEGORIES = [
  'basement_water',
  'damp_wall',
  'standing_water',
  'drainage_issue',
  'well_level',
  'road_flooding',
  'other',
] as const

export type ReportCategory = (typeof REPORT_CATEGORIES)[number]

/** Срочность ставит AI-триаж и подтверждает модератор; житель её не выбирает. */
export const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'] as const

export type UrgencyLevel = (typeof URGENCY_LEVELS)[number]