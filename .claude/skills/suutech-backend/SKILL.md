---
name: suutech-backend
description: SuuTech Supabase backend (v2.0) - additive migrations, reports v2 schema (category_user, comment, location_adjusted_m <= 300, immediate_danger, weather_snapshot), ai_triage, report_status_history trigger, alerts, RLS, moderator role, reports_public view with rounded coordinates, Storage bucket, and Edge Functions submit-report / classify-report / weather-current / send-alert. Use together with the official `supabase` and `supabase-postgres-best-practices` skills whenever touching supabase/migrations, supabase/functions, RLS policies, or /admin data access.
---

# Backend SuuTech (Supabase, ТЗ v2.0)

Сначала загрузи официальные скиллы `supabase` и `supabase-postgres-best-practices` — общие правила Postgres/RLS главнее
этого файла. Здесь — решения проекта. Требования: `docs/spec.md` §7, §8, §12, §14.

## Правила работы
- Схема меняется **только миграциями** (`npx supabase migration new <name>`), вручную в Dashboard — никогда.
- **Миграции аддитивные** до конца демо: `add column if not exists`, `create table if not exists`,
  `drop constraint if exists` перед `add constraint`. `drop column`/`drop table` — только отдельным PR
  очистки v1.0 (пример: `20261025120000_drop_photo_assessments.sql`), с `if exists` и после согласования.
- Локальная проверка без Docker: `npm run verify:sql` (PGlite применяет все миграции и проверяет RLS, права, CHECK).
  Скрипт `scripts/verify-migration.mjs` расширяется вместе со схемой: новый инвариант = новая проверка.
- Прод: Management API `POST /v1/projects/{ref}/database/query`, затем строка в `supabase_migrations.schema_migrations`.
  Разрушительные операции — только после согласования с владельцем.
- После правок схемы обнови `src/shared/types/database.ts` и копии контрактов в `supabase/functions/_shared/`.

## Модель данных v2.0
- `reports`: `id`, `client_id unique`, `created_at`, `captured_at`, `photo_path` (nullable — фото необязательно),
  `lat`/`lng`, `accuracy_m`, `zone_id`, **`category_user`**
  (`basement_water|damp_wall|standing_water|drainage_issue|well_level|road_flooding|other`),
  **`comment`** (`char_length ≤ 500`), **`location_adjusted_m`** (`0…300`, CHECK),
  **`immediate_danger boolean default false`**, **`weather_snapshot jsonb`**, `status`, `moderator_note`,
  `created_by`, `device_hash`, `ip_hash`, `photo_sha256`, `is_demo`.
  Поля v1.0 (`risk_level`, `confidence`, `findings`, `recommendations`, `water_in_basement`, `well_depth_m`, `mode`)
  пока живут рядом — их удаляет остаток PR-5, когда фронт переедет на категории.
- Таблицы v1.0 в схеме больше нет: `photo_assessments` (кэш удалённой Edge Function `analyze-photo`)
  удалена миграцией `20261025120000`; новый код на неё не ссылается и восстанавливать её не нужно.
- `ai_triage` (1:1 к заявке): `report_id pk`, `category_ai`, `urgency_ai`, `summary`, `recommended_action`,
  `duplicate_group`, `confidence`, `needs_human_review`, `model`, `created_at`. Наружу не отдаётся.
- `report_status_history`: `id identity`, `report_id`, `from_status`, `to_status`, `note`, `changed_by`, `created_at`.
  Пишет триггер `private.log_report_status()` (`security definer`, `set search_path = ''`) на `after update of status`.
- `alerts`: `level`, `message`, `source`, `audience`, `zone_id`, **`area text`** (зона словами), **`created_by`**.
- `push_subscriptions`: `endpoint unique`, `keys jsonb`, `area_lat`/`area_lng` (2 знака), `zone_id`, `lang`.
- `moderators`: `user_id uuid pk references auth.users`.
- Индексы: `reports(created_at desc)`, `reports(status)`, `reports(category_user)`, `reports(zone_id)`,
  `ai_triage(duplicate_group)`, `ai_triage(needs_human_review)`, `report_status_history(report_id, created_at desc)`.

## Статусы (§12)
`new → triaged → assigned → in_progress → resolved | rejected`. `reviewed` — legacy v1.0 в CHECK, удаляется в PR-5.
Историю не пиши руками из функции: триггер делает это один раз для любого пути (RPC, функция, SQL).

## Доступ (RLS)
Supabase-скилл предупреждает: обычные view обходят RLS. Поэтому `reports_public`:
1. `reports` — RLS on, политика `select using (true)`, но `revoke select` и колоночные гранты:
   `id, created_at, captured_at, lat_public, lng_public, zone_id, risk_level, confidence, findings, recommendations,
   water_in_basement, well_depth_m, status, photo_path, mode, is_demo, category_user, comment, immediate_danger,
   weather_snapshot, accuracy_m`. Точные `lat`/`lng`, `device_hash`, `ip_hash`, `moderator_note`, `created_by`
   и `ai_triage` наружу не выдаём.
2. `create or replace view public.reports_public with (security_invoker = true) as select … from reports;`
   **Новые колонки только в конец списка**: `create or replace view` падает с `42P16`, если вставить колонку в середину.
3. Модераторы: `private.is_moderator()` (`security definer`, `stable`, `set search_path = ''`, проверяет `auth.uid()`
   в `moderators`). Политики `select` на `ai_triage` и `report_status_history` — только `authenticated` + эта функция.
4. Вставка заявок анонимом — только через `submit-report`. Прямого `insert` для anon нет.
5. Проверка руками: `npm run verify:sql` — anon не видит `lat`, `created_by`, `ai_triage`, историю статусов,
   но видит `reports_public` без служебных полей.

## Storage
- Бакет `report-photos`: только изображения, `file_size_limit` 2 МБ. Путь — `<client_id>/file.jpg` (допускается префикс `reports/`).
- CHECK `reports_photo_belongs_to_client` не даёт приложить чужое фото. EXIF удаляется на клиенте, запись — только из функций.

## Edge Functions (Deno)
- Общий код: `supabase/functions/_shared/` — `cors.ts`, `schemas.ts`, `supabase-admin.ts`, `categories.ts`,
  `triage-contract.ts`, `weather.ts`. Импорты `npm:zod@4`, `npm:@supabase/supabase-js@2`.
- Вход всегда валидируется zod → 400 с кодом; ответы об ошибке `{ error: CODE, message }`; не забывай `OPTIONS`.
- `submit-report` (v4): `category_user` обязателен; фото необязательно; `location_adjusted_m ≤ 300` проверяется
  на сервере; `immediate_danger` пишется как есть; `weather_snapshot` подтягивается из погодного кэша.
  Идемпотентность: `upsert(row, { onConflict: 'client_id', ignoreDuplicates: true })` + `select` при пустом ответе,
  ответ всегда `{ id }` (200), в теле `duplicate` для повтора.
  Лимиты: 10 заявок/час на `device_hash` и 30/час на хэш IP; при сбое счётчика «падаем открыто» (log + пропуск).
- `classify-report`: проверка модератора → контекст заявки и соседей → модель по `triage-contract` →
  `upsert` в `ai_triage`. AI не меняет `status` и не публикуется.
- `weather-current`: Open-Meteo, кэш и TTL, без ключа.
- `send-alert`: ручное предупреждение зоны (баннер + push в PR-5).
- Секреты: `npx supabase secrets set ...`; в коде `Deno.env.get(...)`; перед деплоем `git grep` по ключам.

## /admin
- Вход — Supabase Auth, только аккаунты из `moderators`; гард в UI для удобства, защита — в БД.
- Список и карточка: точные координаты, `ai_triage`, похожие заявки, комментарий модератора, история статусов.
- Смена статуса — RPC/функция с проверкой модератора; после смены обновляются карточка и карта.
- Счётчики: новые, на проверке, повторяющиеся участки, среднее время до проверки (один SQL с `group by`).
- CSV-экспорт — на клиенте из уже загруженных данных, с BOM для Excel.

## Тесты
- `npm run verify:sql`: RLS, колоночные права, CHECK (категория, 500 символов, 300 м), история статусов, приватность view.
- Юнит-тесты функций: валидация входа, лимиты, идемпотентность по `client_id`.