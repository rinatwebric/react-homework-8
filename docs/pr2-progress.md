# PR-2 (срез 2): карта страны, зоны, метки — прогресс

Ветка `feat/slice2-map` (от `main` 9834ad4). Обрывы соединения (`ECONNRESET`) работу не теряют:
каждый шаг = отдельный коммит, ниже видно, что уже лежит на диске. Продолжать с первого незакрытого пункта.

## Сделано (код)

- [x] 1. Границы: `public/geo/kgz-adm1.geojson` (7 областей, 50 КБ) и `kgz-adm2.geojson` (41 район, 64 КБ) —
      geoBoundaries gbOpen KGZ, упрощены mapshaper (precision 0.0001, keep-shapes)
- [x] 2. Зависимости `react-leaflet-cluster@4.1.3` + `@types/leaflet.markercluster` (в `types` у `tsconfig.app.json`)
- [x] 3. Миграция `20261024180000_zone_risk.sql` (публичное чтение, запись только service role, нет строки = «нет данных»)
- [x] 4. `npm run verify:sql`: проверки `zone_risk` (RLS включён, anon читает, anon не пишет) — 25/25 PASS локально
- [x] 5. `src/config/map.ts` (тайлы, границы, `MAP_VIEW`, hex-копии палитры) + `lib/zone-geojson.ts` (zod + `ZoneDataError`)
- [x] 6. `lib/map-filters.ts` (риск/период/статус в URL, `filterReports`) — 20 тестов
- [x] 7. `lib/zone-style.ts`, `lib/marker-visuals.ts`, `lib/report-icon.ts` — 13 тестов
- [x] 8. Хуки загрузки: `useZoneGeo`, `useZoneRisk`, `usePublicReports` + `shared/lib/rest.ts` и `use-async-data.ts` — 9 тестов
- [x] 9. Компоненты: `CountryMap`, `ZoneLayer`, `ReportMarkers`, `ReportPopup`, `MapFiltersBar`, `ZoneInfoCard`, `MapLegend`
- [x] 10. `MapPage` вместо `MapPreview` (`MapPreview` остался для `/admin`), ключи i18n в `ru.json`
- [x] 11. `docs/decisions.md` (лицензии geoBoundaries, кластеры, hex-палитра, публичные данные), `docs/plan.md`
- [x] 12. `npm run build` + `npm run lint` (0 ошибок) + `npm run test` (146) + `npm run verify:sql`; бюджет чанков проверен

## Осталось (нужен человек / прод)

- [ ] Применить миграцию `20261024180000_zone_risk` на прод `ljwyrvyzvuxauylmtosp` (Management API `/database/query`
      + запись версии в `supabase_migrations.schema_migrations`) — иначе `/map` на проде покажет зоны без уровней
- [ ] Пуш ветки, PR, затем проверка с телефона: `/map` → зоны страны, фильтры, метка своего отчёта после отправки
- [ ] `ky.json` — `TODO-ky` список ключей карты в описании PR (перевод проверяет носитель языка)

## Решения, которые нельзя потерять

- Зона без строки в `zone_risk` рисуется серой («нет данных»), не «нормой».
- Метки используют ту же шкалу, что зоны (`toZoneRisk`): low → голубой, medium → янтарный, high → коралловый,
  без оценки → серый. Зелёный/лайм для риска не используются.
- Публичная карта читает только `reports_public` и `zone_risk`; точные координаты — только `/admin` (срез 3).
- Лицензии: ADM1 — ODbL 1.0, ADM2 — CC BY-SA 3.0; атрибуция на карте и в `docs/decisions.md`.