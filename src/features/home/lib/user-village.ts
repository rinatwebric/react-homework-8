/**
 * Определение текущего населенного пункта / района по GPS координатам (reverse geocoding)
 * с кэшированием в sessionStorage/localStorage.
 */

const LOCATION_NAME_KEY = 'suutech_user_location_name'

export interface UserLocationName {
  villageOrCity: string
  subdistrict?: string
  fullTitle: string
}

/**
 * Получить сохраненное ранее имя локации из кэша
 */
export function getCachedLocationName(): UserLocationName | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCATION_NAME_KEY)
    if (raw) return JSON.parse(raw) as UserLocationName
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

    const place =
      addr.village ||
      addr.hamlet ||
      addr.town ||
      addr.city ||
      addr.city_district ||
      addr.suburb

    if (!place) return null

    const result: UserLocationName = {
      villageOrCity: place,
      subdistrict: addr.county || addr.city_district,
      fullTitle: addr.county ? `${place} (${addr.county})` : place,
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
