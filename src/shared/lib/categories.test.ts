import { describe, expect, it } from 'vitest'
// Сырой текст серверного словаря: Deno-код нельзя импортировать в браузерную сборку,
// но сравнить списки значений — можно.
import serverSource from '../../../supabase/functions/_shared/categories.ts?raw'
import { REPORT_CATEGORIES, URGENCY_LEVELS } from './categories'

/**
 * Deno не может импортировать код приложения, поэтому словарь продублирован в
 * supabase/functions/_shared/categories.ts. Этот тест не даёт копиям разойтись:
 * категория, которой нет на сервере, — 400 на отправке заявки.
 */
function readList(name: string): string[] {
  const block = new RegExp(`${name} = \\[([\\s\\S]*?)\\] as const`).exec(serverSource)
  if (!block?.[1]) throw new Error(`В серверном словаре нет ${name}`)
  return [...block[1].matchAll(/'([a-z_]+)'/g)].map((match) => match[1] ?? '')
}

describe('словарь категорий: клиент и сервер', () => {
  it('список категорий совпадает по составу и порядку', () => {
    expect(readList('REPORT_CATEGORIES')).toEqual([...REPORT_CATEGORIES])
  })

  it('список уровней срочности совпадает', () => {
    expect(readList('URGENCY_LEVELS')).toEqual([...URGENCY_LEVELS])
  })

  it('категории уникальны и записаны в snake_case', () => {
    expect(new Set(REPORT_CATEGORIES).size).toBe(REPORT_CATEGORIES.length)
    for (const category of REPORT_CATEGORIES) {
      expect(category).toMatch(/^[a-z]+(_[a-z]+)*$/)
    }
  })
})