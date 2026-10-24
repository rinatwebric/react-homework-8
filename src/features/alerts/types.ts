import { z } from 'zod'

export const alertLevelSchema = z.enum(['info', 'warning', 'critical'])
export type AlertLevel = z.infer<typeof alertLevelSchema>

export const rawAlertSchema = z.object({
  id: z.string().uuid().or(z.string()),
  created_at: z.string(),
  area: z.string().nullable().optional(),
  level: z.enum(['info', 'warning', 'critical', 'elevated', 'high']),
  message: z.string().min(1),
  source: z.string().default('manual').optional(),
  audience: z.string().default('residents').optional(),
  zone_id: z.string().nullable().optional(),
  created_by: z.string().nullable().optional(),
})

export const alertItemSchema = rawAlertSchema.transform((data) => {
  let normalizedLevel: AlertLevel = 'info'
  if (data.level === 'critical') {
    normalizedLevel = 'critical'
  } else if (data.level === 'warning' || data.level === 'elevated' || data.level === 'high') {
    normalizedLevel = 'warning'
  } else {
    normalizedLevel = 'info'
  }

  return {
    ...data,
    level: normalizedLevel,
  }
})

export type AlertItem = z.infer<typeof alertItemSchema>

export interface CreateAlertInput {
  level: AlertLevel
  message: string
  area: string
}
