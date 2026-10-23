---
name: suutech-backend
description: SuuTech Supabase backend - schema, migrations, RLS, moderator role, public view with rounded coordinates, Storage bucket, Edge Functions (submit-report idempotency by client_id, rate limits, anti-fraud), CSV export and admin queries. Use together with the official `supabase` and `supabase-postgres-best-practices` skills whenever touching supabase/migrations, supabase/functions, RLS policies, or /admin data access.
---

# Backend SuuTech (Supabase)

Сначала загрузи официальные скиллы `supabase` и `supabase-postgres-best-practices` — они главнее этого файла
по общим правилам Postgres/RLS. Здесь — решения, специфичные для проекта. Требования: `docs/spec.md` §8–10.
Датчики, `zone_risk`, `ingest-sensor`, `compute-zone-risk` — в скилле `suutech-sensors`.

## Правила работы
- Схема меняется **только миграциями** (`npx supabase migration new <name>`), проверка — `npx supabase db reset` локально.
- Никаких изменений в продакшен-проекте через MCP или Dashboard. Деплой миграций — `npx supabase db push` человеком.
- После миграции обнови типы: `npx supabase gen types typescript --local > src/shared/types/database.ts`.

## Модель данных (минимум)
- `reports`: `id uuid pk default gen_random_uuid()`, `client_id uuid unique not null`, `created_at`, `captured_at`,
  `photo_path`, `lat double precision`, `lng double precision`, `accuracy_m real`, `zone_id text`,
  `risk_level text check in ('low','medium','high')` (nullable — отчёт без оценки), `confidence real`,
  `findings text[]`, `recommendations jsonb`, `water_in_basement boolean not null`, `well_depth_m numeric(5,2)`
  (nullable, `check (well_depth_m between 0 and 50)`), `mode text check in ('resident','farmer')`,
  `status text default 'new' check in ('new','reviewed','in_progress','resolved')`, `moderator_note text`,
  `device_hash text`, `photo_sha256 text`, `is_demo boolean default false`.
- `zone_id` определяется на сервере в `submit-report` (точка в полигоне района; без PostGIS — по ближайшему
  центроиду из `zones.json` как упрощение, решение записать в `docs/decisions.md`).
- Публичные координаты — **генерируемые колонки** `lat_public`/`lng_public` = `round(lat::numeric, 3)` (≈111 м по
  широте, ≈82 м по долготе на 42° с.ш.).
- `push_subscriptions`: `endpoint unique`, `keys jsonb`, `area_lat`/`area_lng` (округлено до 2 знаков), `zone_id`, `lang`, `created_at`.
- `alerts`: `zone_id`, `level ('elevated'|'high'|'critical')`, `message`, `source ('weather'|'sensor'|'manual')`,
  `audience ('residents'|'services')`, `created_at`. Фильтр «для служб» в `/admin` = `audience = 'services'`.
- `moderators`: `user_id uuid pk references auth.users`.
- Таблицы датчиков (`sensors`, `sensor_readings`, `zone_risk`) — см. `suutech-sensors`.
- Индексы: `reports(created_at desc)`, `reports(status)`, `reports(risk_level)`, `reports(zone_id)`, `alerts(created_at desc)`.

## Доступ (RLS) — ключевое решение
Supabase-скилл предупреждает: обычные view обходят RLS. Поэтому `reports_public` делаем так:
1. `reports` — RLS on. Политика `select to anon, authenticated using (true)`, **но** права на колонки:
   `revoke select on reports from anon, authenticated;`
   `grant select (id, created_at, lat_public, lng_public, zone_id, risk_level, confidence, findings, recommendations, water_in_basement, well_depth_m, status, photo_path, is_demo) on reports to anon, authenticated;`
2. `create view reports_public with (security_invoker = true) as select <только эти колонки> from reports;`
3. Модераторы: функция `private.is_moderator()` (`security definer`, `stable`, `set search_path = ''`, проверяет
   `auth.uid()` в `moderators`). Полное чтение и `update` статуса — через Edge Function с проверкой модератора
   или RPC `security definer` с той же проверкой (колонкам `lat`/`lng`/`device_hash` grant для anon не даём).
4. Вставка отчётов анонимом — **только через `submit-report`** (валидация, лимиты, антифейк). Прямой
   `insert` для anon не выдаём.
5. Проверь: от anon `select lat from reports` → ошибка прав; `select * from reports_public` → ок.

## Storage
- Бакет `report-photos`: только изображения, `file_size_limit` 2 МБ. Пути — UUID (`reports/{client_id}.jpg`).
- Публичное чтение допустимо для демо (EXIF удалён, путь неугадываемый); запись — только из функций (service role).

## Edge Functions (Deno)
- Общий код: `supabase/functions/_shared/` — `cors.ts`, `ai-contract.ts`, `schemas.ts`, `supabase-admin.ts`,
  `risk.ts` (маппинг уровней, копия `src/shared/lib/risk.ts`), `weather-rules.ts`, `zone-rules.ts`.
- Импорты: `npm:zod@4`, `npm:@supabase/supabase-js@2`. Входные данные всегда валидируй zod → 400 с кодом ошибки.
- Не забывай `OPTIONS` (CORS) и единый формат ошибок `{ error: CODE, message }`.
- `submit-report` — идемпотентность:
  `upsert(row, { onConflict: 'client_id', ignoreDuplicates: true }).select('id')`; если вернулось пусто —
  `select id where client_id = ...`. Ответ всегда `{ id }` (200), даже для дубля.
  Новый отчёт с `water_in_basement = true` или `risk_level = 'high'` → вызвать `compute-zone-risk` для его зоны.
- Лимиты: ≤ N отчётов в час на `device_hash` и на IP (`x-forwarded-for`), `N` — константа (например 10).
  `device_hash` = SHA-256 от случайного UUID устройства из localStorage (не fingerprinting).
- Антифейк (P2): `accuracy_m` > 200 → отклонить; совпадение `photo_sha256` → пометить дублем; в админке —
  подсветка кластеров (много отчётов с одного устройства/IP за короткое время).
- Секреты: `npx supabase secrets set ...`; в коде `Deno.env.get(...)`. Перед деплоем проверь `git grep` на ключи.

## /admin
- Вход — Supabase Auth (email+пароль), только аккаунты из `moderators`. Гард в UI — для удобства; защита — в БД.
- Смена статуса `new → reviewed → in_progress → resolved` + `moderator_note`; статус сразу виден на публичной карте.
- Зоны: список с уровнем и причинами (`zone_risk.reason`), алерты с фильтром «для служб» (МЧС, муниципальные службы).
- Статистика: всего, по уровням риска, за 7 дней, по дням (один SQL с `group by date_trunc('day', created_at)`),
  счётчик для ЦУР «отчётов / выявлено рисков».
- CSV-экспорт отчётов и алертов — на клиенте из уже загруженных данных (для модератора), с BOM для Excel.

## Тесты
- SQL-проверки RLS в `supabase/tests/` (pgTAP) или скрипт с anon-клиентом: anon не видит точные координаты,
  `api_key_hash`, не может `update`; модератор может.
