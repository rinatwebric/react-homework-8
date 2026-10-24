/**
 * Визуальные параметры меток и кластеров — без Leaflet, чтобы тестировалось в node
 * (vitest.config.ts: environment 'node').
 */
import { NO_DATA_FILL_HEX } from '../../../config/map'
import { CATEGORY_META, type ReportCategory } from '../../../shared/lib/categories'

/**
 * Отчёт красится цветом своей категории из CATEGORY_META,
 * либо серым NO_DATA_FILL_HEX, если категория не указана.
 */
export function reportFillColor(category: ReportCategory | null): string {
  return category && category in CATEGORY_META ? CATEGORY_META[category].hex : NO_DATA_FILL_HEX
}

/** Кластер растёт ступенями: число влезает, кружок не дёргается на каждом ререндере. */
export function clusterSize(count: number): number {
  if (count < 10) return 34
  if (count < 100) return 42
  return 50
}

/** Заявка требует немедленного внимания (угроза жизни / непосредственная опасность). */
export function reportNeedsAttention(immediateDanger: boolean): boolean {
  return immediateDanger
}
