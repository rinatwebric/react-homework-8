/**
 * Контекст перехода к форме заявки: фото уже загружено в бакет `report-photos`.
 *
 * v2.0: фото — необязательное вложение заявки, поэтому форме нужны только
 * `clientId` (id заявки = папка фото) и `photoPath`. Разбор мягкий: state можно
 * подделать или потерять при перезагрузке, тогда вернётся null и заявка уйдёт
 * без фото.
 */
import { z } from 'zod'
import { photoPathSchema } from './report-contract'

export const reportContextSchema = z.object({
  /** client_id заявки: по нему сформирован путь фото, он же станет id заявки. */
  clientId: z.uuid(),
  photoPath: photoPathSchema.nullable(),
})

export type ReportContext = z.infer<typeof reportContextSchema>

/** Что v2-форма реально берёт из контекста: фото и его client_id. */
export type ReportPhotoContext = ReportContext

/** Мягкий разбор: нет контекста (прямой заход на /report) — отчёт без фото. */
export function readReportContext(value: unknown): ReportPhotoContext | null {
  const parsed = reportContextSchema.safeParse(value)
  if (!parsed.success) return null
  return { clientId: parsed.data.clientId, photoPath: parsed.data.photoPath }
}