/**
 * Пилотная зона: село Ак-Өлөң, Тонский район, Иссык-Кульская область.
 * Координаты сверены по двум источникам (Nominatim/OSM: 42.34793, 76.16690;
 * Open-Meteo geocoding: 42.34814, 76.16583). Используются как стартовый фокус карты.
 */
export const PILOT_ZONE = {
  nameRu: 'Ак-Өлөң',
  nameKy: 'Ак-Өлөң',
  districtRu: 'Тонский район',
  regionRu: 'Иссык-Кульская область',
  center: { lat: 42.3479, lng: 76.1669 },
  /** Стартовый зум карты для пилота. */
  zoom: 13,
  /** Полусторонний размер bbox в градусах (≈5 км) — для запросов погоды и кэша. */
  bboxMarginDeg: 0.05,
} as const

export const PILOT_BBOX = {
  south: PILOT_ZONE.center.lat - PILOT_ZONE.bboxMarginDeg,
  north: PILOT_ZONE.center.lat + PILOT_ZONE.bboxMarginDeg,
  west: PILOT_ZONE.center.lng - PILOT_ZONE.bboxMarginDeg,
  east: PILOT_ZONE.center.lng + PILOT_ZONE.bboxMarginDeg,
} as const