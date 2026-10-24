import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getCachedLocationName,
  isUserLocationName,
  reverseGeocodeVillage,
  type UserLocationName,
} from './user-village'

function createMemoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, val: string) => store.set(key, String(val)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
  }
}

describe('user-village', () => {
  let memStorage: ReturnType<typeof createMemoryStorage>

  beforeEach(() => {
    memStorage = createMemoryStorage()
    vi.stubGlobal('localStorage', memStorage)
    vi.stubGlobal('window', { localStorage: memStorage })
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  describe('getCachedLocationName', () => {
    it('возвращает null, если кэш пуст', () => {
      expect(getCachedLocationName()).toBeNull()
    })

    it('возвращает сохраненный объект локации из localStorage', () => {
      const cached: UserLocationName = {
        placeName: 'Ак-Өлөң',
        placeType: 'village',
        typeLabelRu: 'Ваше село',
        subdistrict: 'Тонский район',
        fullTitle: 'Ак-Өлөң (Тонский район)',
      }
      memStorage.setItem('suutech_user_location_name', JSON.stringify(cached))

      expect(getCachedLocationName()).toEqual(cached)
    })

    it('возвращает null при поврежденном JSON в localStorage', () => {
      memStorage.setItem('suutech_user_location_name', '{invalid-json')
      expect(getCachedLocationName()).toBeNull()
    })

    it('возвращает null, если в кэше не объект или невалидная структура', () => {
      memStorage.setItem('suutech_user_location_name', '123')
      expect(getCachedLocationName()).toBeNull()

      memStorage.setItem('suutech_user_location_name', JSON.stringify({ placeName: '' }))
      expect(getCachedLocationName()).toBeNull()

      memStorage.setItem(
        'suutech_user_location_name',
        JSON.stringify({
          placeName: 'Ак-Өлөң',
          placeType: 'invalid_type',
          typeLabelRu: 'Тест',
          fullTitle: 'Тест',
        }),
      )
      expect(getCachedLocationName()).toBeNull()
    })
  })

  describe('isUserLocationName', () => {
    it('валидирует корректный объект UserLocationName', () => {
      expect(
        isUserLocationName({
          placeName: 'Ак-Өлөң',
          placeType: 'village',
          typeLabelRu: 'Ваше село',
          fullTitle: 'Ак-Өлөң',
        }),
      ).toBe(true)
    })

    it('отклоняет невалидные данные', () => {
      expect(isUserLocationName(null)).toBe(false)
      expect(isUserLocationName(undefined)).toBe(false)
      expect(isUserLocationName('string')).toBe(false)
      expect(
        isUserLocationName({
          placeName: '',
          placeType: 'city',
          typeLabelRu: 'Ваш город',
          fullTitle: 'Город',
        }),
      ).toBe(false)
    })
  })

  describe('reverseGeocodeVillage', () => {
    it('обрабатывает город (city) и очищает суффикс " шаары"', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            city: 'Балыкчы шаары',
            county: 'Иссык-Кульская область',
          },
        }),
      } as Response)

      const result = await reverseGeocodeVillage(42.45, 76.18)

      expect(result).not.toBeNull()
      expect(result?.placeName).toBe('Балыкчы')
      expect(result?.placeType).toBe('city')
      expect(result?.typeLabelRu).toBe('Ваш город')
      expect(result?.fullTitle).toBe('Балыкчы (Иссык-Кульская область)')

      // Проверяем запись в кэш
      expect(getCachedLocationName()).toEqual(result)
    })

    it('обрабатывает малый город (town)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            town: 'Каракол',
          },
        }),
      } as Response)

      const result = await reverseGeocodeVillage(42.49, 78.39)

      expect(result?.placeName).toBe('Каракол')
      expect(result?.placeType).toBe('town')
      expect(result?.typeLabelRu).toBe('Ваш город')
      expect(result?.fullTitle).toBe('Каракол')
    })

    it('обрабатывает село (village)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            village: 'Ак-Өлөң',
            county: 'Тонский район',
          },
        }),
      } as Response)

      const result = await reverseGeocodeVillage(42.348, 76.167)

      expect(result?.placeName).toBe('Ак-Өлөң')
      expect(result?.placeType).toBe('village')
      expect(result?.typeLabelRu).toBe('Ваше село')
      expect(result?.subdistrict).toBe('Тонский район')
      expect(result?.fullTitle).toBe('Ак-Өлөң (Тонский район)')
    })

    it('обрабатывает аил/хутор (hamlet)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            hamlet: 'Көк-Мойнок',
          },
        }),
      } as Response)

      const result = await reverseGeocodeVillage(42.3, 76.0)

      expect(result?.placeName).toBe('Көк-Мойнок')
      expect(result?.placeType).toBe('village')
      expect(result?.typeLabelRu).toBe('Ваш аил')
      expect(result?.fullTitle).toBe('Көк-Мойнок')
    })

    it('обрабатывает городской район или пригород (city_district / suburb)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {
            city_district: 'Первомайский район',
          },
        }),
      } as Response)

      const result = await reverseGeocodeVillage(42.87, 74.59)

      expect(result?.placeName).toBe('Первомайский район')
      expect(result?.placeType).toBe('district')
      expect(result?.typeLabelRu).toBe('Ваш район')
    })

    it('возвращает null при статусе ответа не ok (500/404)', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const result = await reverseGeocodeVillage(42.0, 76.0)
      expect(result).toBeNull()
    })

    it('возвращает null при пустом или нераспознанном адресе', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          address: {},
        }),
      } as Response)

      const result = await reverseGeocodeVillage(42.0, 76.0)
      expect(result).toBeNull()
    })

    it('безопасно возвращает null при сбое сети (fetch error)', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const result = await reverseGeocodeVillage(42.0, 76.0)
      expect(result).toBeNull()
    })
  })
})
