import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ky from '../../locales/ky.json'
import ru from '../../locales/ru.json'

export const SUPPORTED_LANGUAGES = ['ru', 'ky'] as const
export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

const DEFAULT_LANGUAGE: AppLanguage = 'ru'

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    ky: { translation: ky },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n