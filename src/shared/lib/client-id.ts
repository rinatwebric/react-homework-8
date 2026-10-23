/**
 * client_id: UUID v4, стабильный на время работы экрана.
 *
 * Срез 1 — ключ идемпотентности и лимитов `analyze-photo`;
 * срез 2 — `reports.client_id` (повторная отправка формы не создаёт дубль).
 * Живёт в shared, потому что нужен и сканеру, и форме отчёта.
 */
export function createClientId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()

  // Safari < 15.4: randomUUID нет, но getRandomValues есть.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const versionByte = bytes[6] ?? 0
  bytes[6] = (versionByte & 0x0f) | 0x40
  const variantByte = bytes[8] ?? 0
  bytes[8] = (variantByte & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}