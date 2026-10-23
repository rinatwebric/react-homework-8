import { registerSW } from 'virtual:pwa-register'

/**
 * Регистрация service worker (свой src/sw.ts через injectManifest).
 * registerType: autoUpdate — новая версия подхватывается сама, без кнопки «обновить».
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  void registerSW({
    immediate: true,
    onOfflineReady() {
      console.info('[SuuTech] офлайн-оболочка готова')
    },
    onRegisterError(error: unknown) {
      console.error('[SuuTech] не удалось зарегистрировать service worker:', error)
    },
  })
}