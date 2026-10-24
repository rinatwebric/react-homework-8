/**
 * Словарь заявки (ТЗ v2.0 §7, §12): категории, срочность, подписи и цвета.
 *
 * Один источник для формы, карты и будущей админки. Серверная копия значений
 * (без иконок и цветов) — `supabase/functions/_shared/categories.ts`: Deno не может
 * импортировать код приложения, менять вместе (тест держит список значений).
 *
 * Цвета категорий — литеральные hex-классы: Tailwind не собирает имена динамически,
 * а Leaflet красит SVG-атрибутом и CSS-переменных не понимает. Палитра категорий
 * намеренно отдельная от шкалы риска (`src/config/risk.ts`): цвет метки отвечает
 * на «что случилось», цвет зоны — на «насколько рискованно». Лайм не используется —
 * он закреплён за главным действием.
 */
import {
  BrickWall,
  Car,
  Droplets,
  HelpCircle,
  Ruler,
  Waves,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/** Категории заявки. Порядок = порядок кнопок в форме (частые сверху). */
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

export const CATEGORY_LABELS_RU: Record<ReportCategory, string> = {
  basement_water: 'Вода в подвале',
  damp_wall: 'Сырость на стенах',
  standing_water: 'Стоячая вода',
  drainage_issue: 'Водоотвод / арык',
  well_level: 'Уровень в колодце',
  road_flooding: 'Затопление дороги',
  other: 'Другое',
}

type CategoryMeta = {
  icon: LucideIcon
  /** Цвет метки на карте (Leaflet): насыщенный, чтобы читался поверх заливки зон. */
  hex: string
  /** Чип формы: рамка + фон + текст. Литеральные классы, не шаблон. */
  chip: string
  /** Точка-маркер в попапе и легенде. */
  dot: string
}

export const CATEGORY_META: Record<ReportCategory, CategoryMeta> = {
  basement_water: {
    icon: Droplets,
    hex: '#2f6fd0',
    chip: 'border-[#2f6fd0] bg-[#e7f0fb] text-[#1d4f96]',
    dot: 'bg-[#2f6fd0]',
  },
  damp_wall: {
    icon: BrickWall,
    hex: '#6b4fa8',
    chip: 'border-[#6b4fa8] bg-[#efe9f8] text-[#4b357e]',
    dot: 'bg-[#6b4fa8]',
  },
  standing_water: {
    icon: Waves,
    hex: '#0f8b8d',
    chip: 'border-[#0f8b8d] bg-[#e2f4f4] text-[#0b6364]',
    dot: 'bg-[#0f8b8d]',
  },
  drainage_issue: {
    icon: Wrench,
    hex: '#a5642a',
    chip: 'border-[#a5642a] bg-[#f8ecdf] text-[#7a4718]',
    dot: 'bg-[#a5642a]',
  },
  well_level: {
    icon: Ruler,
    hex: '#2f7d4f',
    chip: 'border-[#2f7d4f] bg-[#e3f3e9] text-[#1f5a37]',
    dot: 'bg-[#2f7d4f]',
  },
  road_flooding: {
    icon: Car,
    hex: '#b0356b',
    chip: 'border-[#b0356b] bg-[#f9e6ee] text-[#82244d]',
    dot: 'bg-[#b0356b]',
  },
  other: {
    icon: HelpCircle,
    hex: '#5b7288',
    chip: 'border-[#5b7288] bg-[#eef3f7] text-[#3d5163]',
    dot: 'bg-[#5b7288]',
  },
}

/** У заявок v1.0 категории нет: показываем «без категории», а не выдуманную. */
export function categoryMeta(category: ReportCategory | null): CategoryMeta | null {
  return category ? CATEGORY_META[category] : null
}

/**
 * Срочность ставит AI-триаж и подтверждает человек (§8). Житель её не выбирает,
 * на публичной карте её нет: срочность видна только модератору.
 */
export const URGENCY_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type UrgencyLevel = (typeof URGENCY_LEVELS)[number]

export const URGENCY_LABELS_RU: Record<UrgencyLevel, string> = {
  critical: 'Критическая',
  high: 'Высокая',
  medium: 'Средняя',
  low: 'Низкая',
}

type UrgencyMeta = {
  /** Порядок в очереди модератора: critical первым. */
  order: number
  badge: string
}

export const URGENCY_META: Record<UrgencyLevel, UrgencyMeta> = {
  critical: { order: 0, badge: 'border-risk-critical-surface bg-risk-critical-surface text-risk-critical' },
  high: { order: 1, badge: 'border-risk-high-surface bg-risk-high-surface text-risk-high' },
  medium: { order: 2, badge: 'border-risk-elevated-surface bg-risk-elevated-surface text-risk-elevated' },
  low: { order: 3, badge: 'border-risk-normal-surface bg-risk-normal-surface text-risk-normal' },
}
