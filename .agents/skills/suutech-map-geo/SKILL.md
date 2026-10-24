---
name: suutech-map-geo
description: SuuTech geolocation and report map (P0, TZ v2.0). Use when implementing navigator.geolocation capture with the hard 300 m adjustment radius, GPS accuracy and permission-denied flows, the pilot map of Ak-Olong, report markers by category, clustering, filters, popups with status and weather, the kept oblast/district layer with its "reference, not a forecast" caption, or the admin exact-coordinates map.
---

# Геопозиция и карта SuuTech (ТЗ v2.0)

Требования: `docs/spec.md` §6, §7.2, §9. Версии: `react-leaflet@5` (React 19), `leaflet@1.9`,
`react-leaflet-cluster@4`. Категории и цвета — `src/shared/lib/categories.ts`.

## Геопозиция (обязательна)
- `navigator.geolocation.getCurrentPosition(ok, err, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })`
  в чистой функции `getPosition(): Promise<GeoResult>` с типизированными ошибками
  `PERMISSION_DENIED | POSITION_UNAVAILABLE | TIMEOUT | INSECURE_CONTEXT`.
- Нужен HTTPS (или localhost). С телефона по LAN — туннель или preview-деплой.
- `accuracy > 100` м → предупреждение «Точность ~N м. Подождите или уточните метку» + «Уточнить ещё раз»
  (`watchPosition` до 10 с, берём лучший результат).
- Отказ в доступе → экран-инструкция (Android Chrome: замок → Разрешения; iOS: Настройки → Конфиденциальность →
  Службы геолокации). Кнопка «Отправить» **заблокирована** без координат. Демо-координат по умолчанию нет.

## Радиус 300 м (жёсткое правило §7.2)
- На карте — маркер и окружность `L.circle(gps, { radius: 300 })`; та же окружность хорошо видна на светлой подложке.
- Перетаскивание маркера разрешено **только внутри** окружности: на `drag` считаем `haversine(gps, point)`;
  больше 300 м → откатываем позицию и показываем «Метку можно сдвинуть не дальше 300 м от вашей геопозиции».
- `location_adjusted_m = round(haversine(gps, final))` уходит в заявку. Сервер и CHECK в БД проверяют то же значение:
  клиентское ограничение — удобство, а не защита.
- GPS-точка и итоговая точка — разные величины: в `reports.lat/lng` кладём итоговую, сдвиг — в `location_adjusted_m`.
- Чистые функции (`distanceMeters`, `clampToRadius`, `formatDistance`) — с тестами: 299 м ок, 301 м откат,
  граница ровно 300 м проходит.

## Округление
- `roundForPublic(lat, lng)` → 3 знака (≈100 м). На сервере то же делают генерируемые `lat_public`/`lng_public`:
  клиент **не** решает, что публично.

## Карта пилота
- Только в лениво загружаемом чанке: `const MapPage = lazy(() => import('...'))`; `import 'leaflet/dist/leaflet.css'`
  и CSS кластера — внутри модуля карты, не в `main.tsx`.
- Стартовый вид — Ак-Өлөң: `src/config/pilot.ts` (`center`, `zoom`, `bounds`). Координаты брать из OSM/Nominatim
  и проверять глазами; не придумывать. Пользователь может отдалить карту, но рабочая зона демо — пилот.
- Тайлы: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` + атрибуция «© OpenStreetMap contributors»,
  без массовой предзагрузки (OSM Tile Usage Policy).
- **Метки заявок:** `L.divIcon` (дефолтный `L.Icon.Default` ломается в Vite) — цвет и SVG-иконка по категории,
  статус виден кольцом/полупрозрачностью (`resolved`/`rejected` — приглушённые). Обязательно цвет + иконка + текст
  в popup: цвет один не читается при дальтонизме.
- Кластеризация — `MarkerClusterGroup`; фильтры: категория, срочность, статус, период; значения в URL search params.
- Popup: фото (`loading="lazy"`, если есть), категория, комментарий, `immediate_danger`, погода из
  `weather_snapshot`, дата, статус, бейдж «Демо» для `is_demo`.
- Слой «похожие заявки» (`duplicate_group`) — отдельный переключатель, чтобы на демо показать повторяющиеся участки.

## Слой областей и районов — оставлен осознанно
- Границы ADM1 (7 областей) и ADM2 (41 район) из geoBoundaries `gbOpen/KGZ`, упрощены и лежат в `public/geo/`.
  Атрибуция (ADM1 — ODbL, ADM2 — CC BY-SA 3.0) обязательна в attribution карты и в `docs/decisions.md`.
- Владелец решил **не удалять** слой и раскраску (решение 24.10.2026): это визуальный ориентир «где мы».
  Поэтому в `ZoneInfoCard` и в легенде — плашка «слой-ориентир, не прогноз», а для зоны без данных —
  «нет данных» (серый пунктир), не «норма».
- Слой не участвует в приоритизации заявок и не влияет на `urgency` AI. Не добавляй в него новые тексты про «риск».

## Данные
- Публичная карта читает **только** `reports_public` (и `zone_risk` для слоя-ориентира); админская — точные координаты
  через модераторский доступ. Никогда не запрашивай `lat`/`lng` анонимом — прав нет, и это правильно.
- Состояния: загрузка (скелетон), ошибка (повторить), пусто («Пока нет заявок в этом районе»), офлайн
  (последний кэш + плашка «данные могут быть неактуальны»).

## Проверка
- Playwright (`webapp-testing`): `context.grantPermissions(['geolocation'])`, `context.setGeolocation({...})`;
  тест на отказ в доступе → кнопка отправки disabled; тест на перетаскивание за 300 м → откат.
- Размер чанка карты с GeoJSON — проверить в выводе `npm run build`, основной чанк не должен расти.
- Руками: улица и помещение, отказ в доступе, маркер за радиусом, 50+ меток → кластеры, отдаление до страны.