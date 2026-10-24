/**
 * Определение текущего населенного пункта / района по GPS координатам (reverse geocoding)
 * с кэшированием в sessionStorage/localStorage.
 */

const LOCATION_NAME_KEY = 'suutech_user_location_name'

export interface UserLocationName {
  placeName: string
  placeType: 'city' | 'town' | 'village' | 'district'
  typeLabelRu: string
  subdistrict?: string
  fullTitle: string
}

export function isUserLocationName(obj: unknown): obj is UserLocationName {
  if (!obj || typeof obj !== 'object') return false
  const o = obj as Record<string, unknown>
  const validTypes = ['city', 'town', 'village', 'district']
  return (
    typeof o.placeName === 'string' &&
    o.placeName.trim().length > 0 &&
    typeof o.placeType === 'string' &&
    validTypes.includes(o.placeType) &&
    typeof o.typeLabelRu === 'string' &&
    typeof o.fullTitle === 'string'
  )
}

/**
 * Получить сохраненное ранее имя локации из кэша
 */
export function getCachedLocationName(): UserLocationName | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCATION_NAME_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (isUserLocationName(parsed)) return parsed
  } catch {
    // ignore
  }
  return null
}

/**
 * Запрос обратного геокодинга через Nominatim OpenStreetMap
 */
export async function reverseGeocodeVillage(
  lat: number,
  lng: number,
): Promise<UserLocationName | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'ru,ky,en',
      },
    })
    if (!res.ok) return null

    const data = (await res.json()) as {
      address?: {
        village?: string
        hamlet?: string
        town?: string
        city?: string
        city_district?: string
        suburb?: string
        county?: string
        state?: string
      }
    }

    const addr = data.address
    if (!addr) return null

    let placeName = ''
    let placeType: UserLocationName['placeType'] = 'village'
    let typeLabelRu = 'Ваше село'

    if (addr.city) {
      placeName = addr.city
      placeType = 'city'
      typeLabelRu = 'Ваш город'
    } else if (addr.town) {
      placeName = addr.town
      placeType = 'town'
      typeLabelRu = 'Ваш город'
    } else if (addr.village) {
      placeName = addr.village
      placeType = 'village'
      typeLabelRu = 'Ваше село'
    } else if (addr.hamlet) {
      placeName = addr.hamlet
      placeType = 'village'
      typeLabelRu = 'Ваш аил'
    } else if (addr.city_district || addr.suburb) {
      placeName = addr.city_district || addr.suburb || ''
      placeType = 'district'
      typeLabelRu = 'Ваш район'
    }

    if (!placeName) return null

    // Очистка от суффиксов вроде " шаары" если Nominatim выдал на кыргызском
    const cleanPlaceName = placeName.replace(/\s+шаары$/i, '').trim()

    const result: UserLocationName = {
      placeName: cleanPlaceName,
      placeType,
      typeLabelRu,
      subdistrict: addr.county || addr.city_district,
      fullTitle: addr.county ? `${cleanPlaceName} (${addr.county})` : cleanPlaceName,
    }

    try {
      localStorage.setItem(LOCATION_NAME_KEY, JSON.stringify(result))
    } catch {
      // ignore
    }

    return result
  } catch (err) {
    console.warn('[geolocation] Ошибка обратного геокодирования:', err)
    return null
  }
}
