---
name: suutech-map-geo
description: SuuTech geolocation and risk map (P0). Use when implementing navigator.geolocation capture, accuracy warnings, draggable pin adjustment, permission-denied flow, coordinate rounding, the country-wide Leaflet/react-leaflet map with oblast/district risk zones, the pilot focus on Ak-Olong (Issyk-Kul), report and sensor markers with clustering, popups, filters, or the admin exact-coordinates map.
---

# Геопозиция и карта SuuTech

Требования: `docs/spec.md` §6.2, §6.3. Версии: `react-leaflet@5` (React 19), `leaflet@1.9`, `react-leaflet-cluster@4`.
Уровни и цвета риска — таблица в `AGENTS.md`, маппинг — `src/shared/lib/risk.ts`.

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

## Форма отчёта (после результата AI)
- «Есть ли вода в подвале?» — да/нет, обязательный выбор (`water_in_basement`).
- «Глубина уровня воды в колодце, м» — необязательно (`well_depth_m`), `inputmode="decimal"`, zod: 0–50 м,
  подсказка «от поверхности земли до воды». Эти поля — прямые данные о подземной воде, они уходят в правила зоны.

## Округление
- Чистая функция `roundForPublic(lat, lng)` → 3 знака после запятой; тесты Vitest. На сервере то же делает
  генерируемая колонка (см. `suutech-backend`) — клиент **не** решает, что публично.

## Карта всей страны
- Только в лениво загружаемом чанке: `const MapPage = lazy(() => import('...'))`; `import 'leaflet/dist/leaflet.css'`
  и CSS кластера — внутри модуля карты, а не в `main.tsx`.
- Открывается с фокусом на пилоте: `src/config/pilot.ts` (`center`, `zoom`, `bounds`). Координаты Ак-Өлөң
  возьми из OSM/Nominatim и проверь глазами на карте; не придумывай. Пользователь может отдалить до всей страны.
- **Зоны:** границы областей (ADM1, 7) и районов (ADM2, 41) — geoBoundaries `gbOpen/KGZ`
  (`https://www.geoboundaries.org/api/current/gbOpen/KGZ/ADM1/` → поле `simplifiedGeometryGeoJSON`).
  ADM1 — ODbL, ADM2 — CC BY-SA 3.0: добавь атрибуцию на карте и в `docs/decisions.md`.
  Дополнительно упрости (`npx mapshaper ... -simplify 10% keep-shapes -o precision=0.0001`) до ≲ 150 КБ на файл,
  положи в `public/geo/` и грузи `fetch` только на карте. `zone_id` = `shapeID` из GeoJSON, он же ключ `zone_risk`.
- Заливка зоны — `GeoJSON` слой со `style` по уровню из `zone_risk` (зелёный/жёлтый/оранжевый/красный,
  `fillOpacity` ~0.35, граница темнее); зона без данных — серая штриховка/прозрачная, не «зелёная» (норма ≠ нет данных).
  На зуме ≤ 7 показывай области, глубже — районы. Клик по зоне — уровень, причины (`reasons`), время обновления.
- Тайлы: `https://tile.openstreetmap.org/{z}/{x}/{y}.png` + атрибуция «© OpenStreetMap contributors».
  Соблюдай OSM Tile Usage Policy (без массовой предзагрузки; см. `suutech-offline-pwa`).
- **Метки отчётов:** не используй дефолтный `L.Icon.Default` (ломается в Vite) — `L.divIcon` с цветом + SVG-иконкой:
  `low` → зелёный (галочка), `medium` → жёлтый (восклицательный), `high` → оранжевый (треугольник),
  без оценки → серый (вопрос). Красный — только у зон/датчиков в `critical`. Цвета — из токенов дизайн-системы.
- **Датчики:** отдельная форма значка (например квадрат/капля с иконкой датчика), цвет по уровню датчика,
  бейдж «Симуляция» для `is_simulated`. Отдельный слой, переключатель «Отчёты / Датчики / Зоны».
- Кластеризация отчётов: `MarkerClusterGroup` из `react-leaflet-cluster`; датчики не кластеризовать.
- Popup отчёта: фото (`loading="lazy"`), риск, вода в подвале, глубина колодца, рекомендации, дата, статус, бейдж «Демо».
- Фильтры: риск, период (7/30 дней/всё), статус — в URL search params.
- Данные: публичная карта читает **только** `reports_public`, `zone_risk`, публичные поля `sensors`;
  админская — полный источник через модераторский доступ.
- Состояния: загрузка (скелетон), ошибка (повторить), пусто («Пока нет отчётов в этом районе»), офлайн (кэш + плашка).

## Проверка
- Playwright (`webapp-testing`): `context.grantPermissions(['geolocation'])`, `context.setGeolocation({...})`;
  тест на отказ в доступе → кнопка отправки disabled.
- Размер чанка карты с GeoJSON — проверить в выводе `npm run build`, основной чанк не должен вырасти.
- Руками: улица и помещение, отказ в доступе, перетаскивание метки, 50+ меток → кластеры, отдаление до всей страны.
