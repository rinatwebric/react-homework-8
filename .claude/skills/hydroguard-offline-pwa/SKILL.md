---
name: hydroguard-offline-pwa
description: HydroGuard KG PWA shell and offline mode (P0 install + P1 offline). Use when configuring vite-plugin-pwa (injectManifest, custom src/sw.ts), the web manifest and icons, precaching, runtime caching of OSM map tiles, the IndexedDB report queue with idb (draft/queued/uploading/done/failed), background sync and retry, client_id idempotency, the offline indicator, or the airplane-mode demo flow.
---

# PWA и офлайн HydroGuard

Требования: `docs/spec.md` §7.1, §11. Это «вау-момент» демо: авиарежим → отчёт → сеть → метка на карте.

## PWA-оболочка (срез 0)
- `vite-plugin-pwa` 2.x, `strategies: 'injectManifest'`, `srcDir: 'src'`, `filename: 'sw.ts'` — свой SW нужен для push.
- `registerType: 'autoUpdate'`, но **в день демо** не выкатывать обновления (заморозка); `devOptions: { enabled: true, type: 'module' }`.
- Manifest: `name`, `short_name: 'HydroGuard'`, `lang: 'ru'`, `display: 'standalone'`, `start_url: '/'`,
  `theme_color`, иконки 192/512 + `maskable`. Иконки — `@vite-pwa/assets-generator` из одного SVG.
- iOS: `apple-touch-icon` + `<meta name="apple-mobile-web-app-capable">`; экран-подсказка «Как установить» (Поделиться → На экран «Домой»).
- В `sw.ts`: `precacheAndRoute(self.__WB_MANIFEST)`, `cleanupOutdatedCaches()`, навигационный fallback на `index.html`
  (кроме `/admin` API-запросов), `self.skipWaiting()`/`clients.claim()` по сообщению.

## Кэш тайлов карты
- Runtime-маршрут для `tile.openstreetmap.org`: `CacheFirst`, `cacheName: 'osm-tiles'`,
  `ExpirationPlugin({ maxEntries: 1500, maxAgeSeconds: 14 дней })`, `CacheableResponsePlugin({ statuses: [0, 200] })`
  (тайлы `<img>` приходят opaque).
- OSM Tile Usage Policy запрещает массовую предзагрузку. Поэтому: кэшируем то, что пользователь посмотрел;
  перед демо на демонстрационных телефонах вручную пролистай район пилота на зумах 10–15. Если нужен
  настоящий офлайн-пакет — провайдер с ключом, разрешающий офлайн (решение → `docs/decisions.md`).
- API Supabase **не кэшировать** в SW, кроме последнего ответа `reports_public` (`NetworkFirst`, таймаут 3 с) для офлайн-карты.

## Очередь отчётов (IndexedDB, `idb`)
- БД `hydroguard`, store `reports` (keyPath `client_id`), индекс по `status`. Модуль `src/features/offline/queue.ts`.
- Запись: `{ client_id (crypto.randomUUID()), photo: Blob, captured_at, lat, lng, accuracy_m, mode, lang,
  status, attempts, last_error, assessment? , created_at }`. При чтении — валидация zod (данные могли устареть).
- Статусы: `draft → queued → uploading → done | failed`. Переходы — чистая функция-редьюсер с тестами.
  `uploading`, «зависший» дольше 2 мин (вкладку закрыли) → обратно в `queued`.
- Синхронизация `syncQueue()`: по одному отчёту; `analyze-photo` → `submit-report` (с тем же `client_id`).
  Успех → `done` и удалить Blob; ошибка сети → `queued`, `attempts++`, backoff 5 с · 2^n (макс 5 мин);
  ошибка 4xx (валидация) → `failed` с понятным текстом и кнопкой «Удалить/Повторить».
- Триггеры: Background Sync (`registration.sync.register('sync-reports')`, есть только в Chromium) + событие
  `online` + при старте приложения + кнопка «Отправить сейчас». Защита от параллельного запуска — lock (флаг в памяти
  + `navigator.locks.request`, где доступно).
- Сервер идемпотентен по `client_id`, поэтому повторная отправка не создаёт дублей — это и есть проверка приёмки.
- Офлайн AI нет: показываем «Отчёт сохранён. Оценка появится при подключении». Не выдавать локальный чек-лист за AI.

## UI
- Плашка «Нет сети · в очереди: N» (`navigator.onLine` + события + реальный результат последнего запроса).
- Экран «Мои отчёты»: список из очереди со статусами.
- Квота: проверяй `navigator.storage.estimate()`; запроси `navigator.storage.persist()` после первого отчёта.

## Проверка
- Vitest + `fake-indexeddb`: переходы статусов, backoff, восстановление «зависших».
- Playwright: `context.setOffline(true)` → создать отчёт → `setOffline(false)` → ровно одна запись на сервере.
- `npm run build && npm run preview` → Chrome DevTools: Application → Service Workers/Cache Storage; Lighthouse PWA.
- Телефон: установить PWA, авиарежим, отчёт, закрыть приложение, включить сеть, открыть — отчёт ушёл.
