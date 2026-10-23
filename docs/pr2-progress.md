# PR-2 (срез 2): карта страны, зоны, метки — прогресс

Ветка `feat/slice2-map` (от `main` 9834ad4). Обрывы соединения (`ECONNRESET`) работу не теряют:
каждый шаг = отдельный коммит, ниже видно, что уже лежит на диске. Продолжать с первого незакрытого пункта.

- [x] 1. Границы: `public/geo/kgz-adm1.geojson` (7 областей, 50 КБ) и `kgz-adm2.geojson` (41 район, 64 КБ) —
      geoBoundaries gbOpen KGZ, упрощены mapshaper (precision 0.0001, keep-shapes)
- [x] 2. Зависимость `react-leaflet-cluster@4.1.3` (peer: react-leaflet ^5, react 19)
- [x] 3. Миграция `20261024180000_zone_risk.sql` (публичное чтение, запись только service role)
- [ ] 4. `npm run verify:sql`: проверки `zone_risk` (RLS включён, anon читает, anon не пишет)
- [ ] 5. `src/config/map.ts` + `src/features/map/lib/zone-geojson.ts` (zod-валидация GeoJSON) + тест
- [ ] 6. `src/features/map/lib/map-filters.ts` (риск/период/статус в URL) + тест
- [ ] 7. `zone-style.ts`, `report-icon.ts` + тесты; иконки меток в `src/shared/lib/leaflet-icons.ts`
- [ ] 8. Хуки загрузки: `useZoneGeo`, `useZoneRisk`, `usePublicReports` (+ `shared/lib/rest.ts` для PostgREST)
- [ ] 9. Компоненты: `CountryMap`, `ZoneLayer`, `ReportMarkers`, `ReportPopup`, `MapFiltersBar`, `ZoneInfoCard`, `MapLegend`
- [ ] 10. `MapPage` вместо `MapPreview`, ключи i18n в `ru.json` (+ `TODO-ky` списком в PR)
- [ ] 11. `docs/decisions.md` (лицензии geoBoundaries, зависимость, палитра меток), `docs/plan.md`
- [ ] 12. `npm run build && npm run lint && npm run test && npm run verify:sql`, бюджет чанка карты

## Решения, которые нельзя потерять

- Зона без строки в `zone_risk` рисуется серой («нет данных»), не «нормой».
- Метки используют ту же шкалу, что зоны (`toZoneRisk`): low → голубой, medium → янтарный, high → коралловый,
  без оценки → серый. Зелёный/лайм для риска не используются.
- Публичная карта читает только `reports_public` и `zone_risk`; точные координаты — только `/admin` (срез 3).
- Лицензии: ADM1 — ODbL 1.0, ADM2 — CC BY-SA 3.0; атрибуция на карте и в `docs/decisions.md`.