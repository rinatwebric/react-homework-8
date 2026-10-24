# PR-2 (этап 1, часть «форма»): заявка v2.0 — прогресс

Ветка `feat/report-v2-form`. Часть PR-2 про карту закрыта отдельно (`docs/pr2-progress.md`).
Здесь — форма отчёта, контракт `submit-report` v4 (тело v2.0) и серверная валидация.

## Сделано (код)

- [x] `src/shared/lib/categories.ts` — словарь `REPORT_CATEGORIES` (7 категорий), `URGENCY_LEVELS`;
      копия для Deno: `supabase/functions/_shared/categories.ts`; паритет держит `categories.test.ts`.
- [x] `src/shared/lib/geo.ts` — `distanceMeters`, `bearingDegrees`, `destinationPoint`,
      `clampPointToRadius` (радиус 300 м по лучу), `formatAccuracy`; 17 тестов.
- [x] `src/shared/types/report-contract.ts` — контракт v2.0: `mapPointSchema`, `gpsFixSchema`,
      `weatherSnapshotSchema`, `submitReportRequestSchema` (категория обязательна, `comment` nullable,
      `immediate_danger`, `photo_path`, `weather_snapshot`) + `superRefine` на папку фото и 300 м.
      Серверная копия — `supabase/functions/_shared/report-schema.ts`.
- [x] `useGeolocation` — фикс + `refining`, `setManualPoint` притягивает пин в радиус и ставит `clamped`.
- [x] `ReportPage` — экран v2: `CategoryPicker`, `CommentField`, `DangerToggle`, фото без обязательности,
      `submissionBlock` держит кнопку честной; черновик в `useMemo`.
- [x] Удалены `WaterBasementField.tsx`, `WellDepthField.tsx` и их ключи i18n (`basement`, `wellDepth`,
      `photoAttached*`, `noPhoto*`).
- [x] `submit-report` (v4) — пишет v2-поля, сдвиг метки считает сам (`location_adjusted_m`), идемпотентность
      по `client_id`, лимиты по `device_hash` и хэшу IP.
- [x] `ZoneInfoCard` — подпись «слой-ориентир, не прогноз» (`map.zoneModelHint`).
- [x] Честная блокировка отправки: причина `gps` отдельно от `location` — метка вручную не заменяет
      геопозицию (§7), в отказе браузера под кнопками стоит `location.manualNote`.
- [x] Гейт: `typecheck` · `lint` (0 ошибок, 2 известных warning) · `test` (173) · `build` · `verify:sql` (35/35).

## Осталось (нужен человек / прод)

- [x] Миграция `20261024190000_reports_v2_triage` применена на прод 24.10.2026: версия записана в
      `supabase_migrations.schema_migrations`, на месте колонки `category_user`, `location_adjusted_m`,
      `weather_snapshot`, `device_hash`, `immediate_danger`, `moderator_note` и CHECK `reports_category_user_check`.
- [x] `submit-report` задеплоена: версия 4, `ACTIVE`, `verify_jwt: true`. Смоук v2.0-контрактом:
      заявка создана (200, `duplicate: false`), `zone_id = kg-issyk-ton-ak-olong` проставлен,
      `location_adjusted_m = 27.7` посчитан сервером, тестовая строка удалена.
- [ ] Смоук с телефона: `/report` без фото → категория + пин в радиусе 300 м → отчёт виден модератору,
      на карте после `triaged`.
- [ ] `ky.json` — `TODO-ky` ключи `report.*` (перевод проверяет носитель языка).
- [ ] Погодный снимок (`weather_snapshot`) заполнится в PR-3 вместе с `weather-current`.
- [ ] Карточка метки и фильтры по категории/опасности на карте: `ReportPopup` пока читает v1-поля
      (`risk_level`, `water_in_basement`), поэтому новая заявка выглядит как «нет оценки». Часть PR-2 «карта».

## Решения, которые нельзя потерять

- 300 м проверяются трижды: `clampPointToRadius` (UI) → `superRefine` (клиент и сервер) → CHECK в БД.
- `client_id` заявки = `client_id` папки фото: чужой путь сервер отклоняет (400).
- Пустой комментарий = `null`; длина — по code points, как `char_length` в Postgres.
- AI-оценка фото в заявку не входит и на форме не показывается: она нужна только модератору (§8).