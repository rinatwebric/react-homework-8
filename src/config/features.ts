/**
 * Флаги нестабильных функций. Всё, что не готово к демо, выключено по умолчанию.
 * Значения задаются через VITE_FF_* (см. .env.example), дефолт — false.
 * Погода (Срез 3) — базовая функциональность P0 (§10), включена по умолчанию,
 * но может быть отключена аварийно через VITE_FF_WEATHER=false.
 */
const readFlag = (value: string | undefined): boolean => value === 'true'

export const features = {
  weather: import.meta.env.VITE_FF_WEATHER !== 'false',
  sensors: readFlag(import.meta.env.VITE_FF_SENSORS),
  offline: readFlag(import.meta.env.VITE_FF_OFFLINE),
  push: readFlag(import.meta.env.VITE_FF_PUSH),
  farmer: readFlag(import.meta.env.VITE_FF_FARMER),
  premium: readFlag(import.meta.env.VITE_FF_PREMIUM),
  kyrgyz: readFlag(import.meta.env.VITE_FF_KYRGYZ),
} as const

export type FeatureName = keyof typeof features
