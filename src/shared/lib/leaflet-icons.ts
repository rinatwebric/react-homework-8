/**
 * Иконки Leaflet: inline-SVG внутри divIcon (эмодзи нельзя, AGENTS.md).
 * Цвета — из дизайн-токенов src/index.css: лайм только для главного действия
 * и для пина отчёта, риски — своей шкалой.
 */
import L from 'leaflet'

const INK = '#123a5c'
const LIME = '#b6e534'

type PinIconOptions = {
  fill?: string
  stroke?: string
  /** Подпись для screen reader невозможна у divIcon — текст дублируем вне карты. */
  size?: number
}

/** Каплевидный пин для карты отчёта. */
export function createPinIcon({ fill = LIME, stroke = INK, size = 34 }: PinIconOptions = {}): L.DivIcon {
  const height = Math.round(size * 1.29)
  const html = `
<svg width="${size}" height="${height}" viewBox="0 0 34 44" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <path d="M17 43C17 43 33 26.6 33 16.5C33 7.4 25.8 0 17 0C8.2 0 1 7.4 1 16.5C1 26.6 17 43 17 43Z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
  <circle cx="17" cy="16" r="6" fill="${stroke}"/>
</svg>`

  return L.divIcon({
    html,
    className: 'suutech-map-pin',
    iconSize: [size, height],
    iconAnchor: [size / 2, height - 1],
  })
}