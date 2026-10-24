/// <reference lib="webworker" />
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { ExpirationPlugin } from 'workbox-expiration'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

/**
 * Service Worker SuuTech (injectManifest):
 * 1. Precache статических ресурсов приложения (SPA shell)
 * 2. Runtime-кэширование тайлов карты OSM (CacheFirst, 14 дней, до 1500 тайлов)
 * 3. Runtime-кэширование публичных меток карты reports_public (NetworkFirst, 3 с)
 * 4. Навигационный fallback на index.html
 */
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Parameters<typeof precacheAndRoute>[0]
}

void self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()

precacheAndRoute(self.__WB_MANIFEST)

// Кэширование тайлов OpenStreetMap (P0/P1 офлайн-карта пилота)
registerRoute(
  ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
  new CacheFirst({
    cacheName: 'osm-tiles',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 1500,
        maxAgeSeconds: 14 * 24 * 60 * 60, // 14 дней
        purgeOnQuotaError: true,
      }),
    ],
  }),
)

// Кэширование публичных данных карты для работы без сети (NetworkFirst, таймаут 3 с)
registerRoute(
  ({ url }) => url.pathname.includes('/rest/v1/reports_public'),
  new NetworkFirst({
    cacheName: 'reports-public-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60, // 24 часа
      }),
    ],
  }),
)

// SPA-навигация: любой путь отдаёт index.html.
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/functions\//],
  }),
)

// Приём входящего Web Push уведомления при свёрнутом приложении
self.addEventListener('push', (event: PushEvent) => {
  let title = 'SuuTech: Оперативное оповещение'
  let body = 'Поступило новое предупреждение о риске подтопления.'
  let tag = 'suutech-push-alert'
  let url = '/'

  if (event.data) {
    try {
      const data = event.data.json() as {
        title?: string
        body?: string
        message?: string
        tag?: string
        url?: string
        level?: string
      }
      if (data.title) title = data.title
      if (data.body || data.message) body = data.body || data.message || body
      if (data.tag) tag = data.tag
      if (data.url) url = data.url
    } catch {
      const text = event.data.text()
      if (text) body = text
    }
  }

  const isEmergency =
    tag.includes('critical') ||
    title.toLowerCase().includes('чс') ||
    title.toLowerCase().includes('опасность') ||
    title.toLowerCase().includes('внимание')

  const options: NotificationOptions & { vibrate?: number[] } = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: isEmergency ? [300, 100, 300, 100, 300] : [200, 100, 200],
    requireInteraction: isEmergency,
    tag,
    data: { url },
  }

  event.waitUntil(
    self.registration.showNotification(title, options as NotificationOptions),
  )
})

// Клик по системному уведомлению на телефоне/десктопе
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const notifData = event.notification.data as { url?: string } | undefined
  const targetUrl = notifData?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если окно SuuTech уже открыто — переключаемся на него
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      // Иначе открываем приложение
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    }),
  )
})

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const data: unknown = event.data
  if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'SKIP_WAITING') {
    void self.skipWaiting()
  }
})
