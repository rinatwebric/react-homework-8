/**
 * Уровень риска зоны из таблицы `zone_risk` (срез 3 начнёт её заполнять правилами).
 * Нет строки = нет данных = серый цвет на карте; «норма» — только явный `normal`.
 */
import { z } from 'zod'
import { RISK_LEVELS, type RiskLevel } from '../../../config/risk'

export const zoneRiskRowSchema = z.object({
  zone_id: z.string().min(1),
  level: z.enum(RISK_LEVELS),
  reasons: z.array(z.string()),
})

export type ZoneRiskRow = z.infer<typeof zoneRiskRowSchema>

export const ZONE_RISK_SELECT = 'zone_id,level,reasons'

/** Плоский список → lookup по zone_id: карта ищет уровень на каждую зону при отрисовке. */
export function toZoneRiskMap(raw: unknown): Map<string, RiskLevel> {
  const parsed = z.array(zoneRiskRowSchema).safeParse(raw)
  if (!parsed.success) throw new Error('Ответ базы по риску зон повреждён')

  const levels = new Map<string, RiskLevel>()
  for (const row of parsed.data) levels.set(row.zone_id, row.level)
  return levels
}