---
name: hydroguard-web-push
description: HydroGuard KG Web Push alerts (P1). Use when implementing VAPID keys, the opt-in "Get warnings?" screen, PushManager subscription, the subscribe-push and send-push Edge Functions, push/notificationclick handlers in src/sw.ts, the admin "send test alert" button, iOS installed-PWA requirements, or the in-app banner fallback.
---

# Web Push HydroGuard

Требования: `docs/spec.md` §7.2, §6.5. Для демо обязательна кнопка «Отправить тестовое предупреждение» в `/admin`.

## Ключи
- Сгенерировать один раз: `npx web-push generate-vapid-keys`.
- Public → `VITE_VAPID_PUBLIC_KEY` (клиент). Private + subject (`mailto:...`) → `npx supabase secrets set
  VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=...`. Private в клиенте/репозитории — блокер.

## Подписка (клиент)
- Не спрашивать разрешение при загрузке. Сначала свой экран «Получать предупреждения о подтоплении?»
  с объяснением; системный запрос `Notification.requestPermission()` — только по нажатию кнопки.
- Проверки поддержки: `'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window`.
- iOS/iPadOS 16.4+: push только у **установленной** PWA (standalone). Если Safari не в standalone —
  показать экран «Как установить» вместо кнопки подписки.
- `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) })`
  → `POST subscribe-push { subscription, area_lat, area_lng (округлить до 0.01), lang }`.
- Отказ/`denied` → тихо работаем с баннером внутри приложения; не спрашиваем повторно.

## Service worker (`src/sw.ts`)
- `push`: распарсить JSON `{ title, body, url, level }` (с безопасным fallback), `self.registration.showNotification(...)`
  с `icon`, `badge`, `tag` (чтобы не спамить одинаковыми), `data: { url }`.
- `notificationclick`: закрыть, сфокусировать открытую вкладку или `clients.openWindow(url)`.

## Сервер
- `subscribe-push`: валидация zod, `upsert` по `endpoint`.
- `send-push`: вызывается (а) из `/admin` — проверить JWT и что пользователь модератор; (б) из `weather-check`/cron —
  по секретному заголовку. Payload ≤ ~3 КБ.
- Библиотека для Deno: `jsr:@negrel/webpush` (Node-пакет `web-push` в Deno Edge Runtime работает ненадёжно).
  Перед реализацией сверить API по README пакета (используй Context7 / WebFetch).
- Ответ push-сервиса 404/410 → удалить подписку. Отправлять параллельно пачками (например по 20), считать
  успехи/ошибки и вернуть сводку `{ sent, failed, removed }` — её же показать в админке.
- Каждое отправленное предупреждение пишется в `alerts` → баннер в приложении читает последние `alerts`
  (это fallback, если push не дошёл).

## Проверка
- Android Chrome: подписка → кнопка в админке → уведомление при свёрнутом приложении.
- iPhone: установить PWA → подписка из установленного приложения → уведомление.
- Desktop Chrome DevTools → Application → Service Workers → Push (тестовый payload).
- В день демо: проверить, что телефон не в режиме «Не беспокоить» и уведомления сайта разрешены.
