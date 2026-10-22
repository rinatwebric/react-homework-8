---
name: hydroguard-map-geo
description: HydroGuard KG geolocation and risk map (P0). Use when implementing navigator.geolocation capture, accuracy warnings, draggable pin adjustment, permission-denied flow, coordinate rounding, the Leaflet/react-leaflet map centered on Ak-Olong (Issyk-Kul), risk markers with clustering, report popups, filters, or the admin exact-coordinates map.
---

# Геопозиция и карта HydroGuard

Требования: `docs/spec.md` §6.2, §6.3. Версии: `react-leaflet@5` (React 19), `leaflet@1.9`, `react-leaflet-cluster@4`.

## Геопозиция (обязательна)
- `navigator.geolocation.getCurrentPosition(ok, err, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })`.
  Оберни в чистую функцию `getPosition(): Promise<GeoResult>` с типизированными ошибками
  `PERMISSION_DENIED | POSITION_UNAVAILABLE | TIMEOUT | INSECURE_CONTEXT`.
- Нужен HTTPS (или localhost). На Vercel ок; при тесте с телефона по LAN — используй туннель или preview-деплой.
- `accuracy > 100` м → жёлтое предупреждение «Точность ~N м. Подождите или уточните метку на карте» +
  кнопка «Уточнить ещё раз» (можно `watchPosition` до 10 с, берём лучший результат).
- Отказ в доступе → экран-инструкция (Android Chrome: замок в адресной строке → Разрешения; iOS: Настройки →
  Конфиденциальность → Службы геолокации → Safari/сайт). Кнопка «Отправить» **заблокирована** без координат.
- Ручное уточнение: перетаскиваемая метка (`draggable`) в радиусе разумного смещения (например ≤ 500 м от GPS;
  дальше — предупреждение). Сохраняем и исходные GPS, и итоговые координаты + `accuracy_m`.
- Офлайн GPS работает — координаты пишутся в черновик в IndexedDB.

## Округление
- Чистая функция `roundForPublic(lat, lng)` → 3 знака после запятой; тесты Vitest. На сервере то же самое делает
  генерируемая колонка (см. `hydroguard-backend`) — клиент **не** решает, что публично.

## Карта
- Только в лениво загружаемом чанке: `const MapPage = lazy(() => import('...'))`; `import 'leaflet/dist/leaflet.css'`
  внутри модуля карты, а не в `main.tsx`.
- Центр и границы пилота — `src/config/pilot.ts` (`center`, `zoom`, `bounds`). Координаты Ак-Өлөң проверь по OSM
  перед вставкой; не придумывай.
- Тайлы: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` + обязательная атрибуция «© OpenStreetMap contributors».
  Соблюдай OSM Tile Usage Policy (без массовой предзагрузки; см. `hydroguard-offline-pwa`).
- Иконки маркеров: не используй дефолтный `L.Icon.Default` (ломается в Vite из-за путей) — делай `L.divIcon`
  с цветом + SVG-иконкой риска (зелёный — галочка, жёлтый — восклицательный знак, красный — треугольник-предупреждение,
  серый — вопрос для «без оценки»). Цвета — из токенов дизайн-системы.
- Кластеризация: `MarkerClusterGroup` из `react-leaflet-cluster` (подключи его CSS в чанке карты).
- Popup/карточка: фото (lazy `<img loading="lazy">`), риск, рекомендации, дата, статус, бейдж «Демо» для `is_demo`.
- Фильтры: риск, период (7/30 дней/всё), статус — в URL search params, чтобы ссылкой можно было поделиться.
- Данные: публичная карта читает **только** `reports_public`; админская — полный источник через модераторский доступ.
- Состояния: загрузка (скелетон), ошибка (повторить), пусто («Пока нет отчётов в этом районе»), офлайн (кэш + плашка).

## Проверка
- Playwright (`webapp-testing`): `context.grantPermissions(['geolocation'])`, `context.setGeolocation({...})`;
  отдельный тест на отказ в доступе → кнопка отправки disabled.
- Руками: телефон на улице и в помещении, отказ в доступе, перетаскивание метки, 50+ меток → кластеры.
