/**
 * Карта страны (срез 2): тайлы, границы зон, пороги зума, лимиты.
 *
 * Цвета риска — те же, что в @theme (src/index.css), но Leaflet красит SVG-атрибутами
 * и CSS-переменные не понимает: здесь их hex-копии. Менять только вместе с токенами.
 */
import type { RiskLevel } from './risk'

export const MAP_TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  maxZoom: 19,
} as const

/**
 * Границы зон: geoBoundaries gbOpen KGZ (ADM1 — 7 областей, ADM2 — 41 район),
 * упрощены mapshaper до ≲150 КБ на файл. Грузятся только на /map и в SW-прекэш не входят.
 * Лицензии: ADM1 — ODbL 1.0, ADM2 — CC BY-SA 3.0, атрибуция обязательна.
 */
export const MAP_ZONES = {
  adm1Url: '/geo/kgz-adm1.geojson',
  adm2Url: '/geo/kgz-adm2.geojson',
  /** На мелком масштабе показываем области, глубже — районы: иначе на телефоне не читается. */
  districtsFromZoom: 8,
  attribution:
    'Границы: <a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer">geoBoundaries</a> · ODbL 1.0 / CC BY-SA 3.0',
} as const

/** Сколько меток отчётов тянем на публичную карту (демо-масштаб, без пагинации). */
export const MAP_REPORTS_LIMIT = 500

/** Hex-копии токенов --color-risk-*-fill: заливка зон и цвет метки. */
export const RISK_FILL_HEX: Record<RiskLevel, string> = {
  normal: '#8fd6e6',
  elevated: '#f2a93b',
  high: '#e4644e',
  critical: '#c33b2a',
}

/** Зона без строки в zone_risk — серая, а не «норма» (AGENTS.md: норма ≠ нет данных). */
export const NO_DATA_FILL_HEX = '#b9c6d2'

/** «Чернильный» токен --color-ink: обводка меток и границ зон. */
export const MAP_INK_HEX = '#123a5c'