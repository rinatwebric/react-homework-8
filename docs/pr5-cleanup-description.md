## Что меняется

Из продукта убран легаси v1.0: **AI-сканер фото** и **раздел «Вода»**. Фото осталось тем, чем
его видит ТЗ v2.0 (§7) — необязательным вложением заявки; отдельного экрана, отдельной функции
и отдельной таблицы у него больше нет.

- **Фронт** — удалены `src/features/scanner` (`/scan`: анализ фото, сжатие, EXIF, результат оценки)
  и `src/features/water` (`/water`), их маршруты и ленивые чанки (`router.tsx`, `lazyRoutes.ts`),
  пункты навигации и плитки (`Layout.tsx`, `HomePage.tsx`), i18n-ключи `scan`/`water`,
  флаг `VITE_FF_WATER_VOLUME`, `src/config/ai.ts`, зависимость `browser-image-compression`.
- **Бэкенд** — удалены Edge Function `analyze-photo` и её общий код (`_shared/vision.ts`,
  `_shared/prompt.ts`, `_shared/ai-contract.ts`, клиентский `src/shared/types/ai-contract.ts`).
- **БД** — миграция `20261025120000_drop_photo_assessments.sql`: `drop table if exists
  public.photo_assessments` (кэш сканера + журнал лимита частоты). Миграция-создатель
  `20261023141500_ai_photo_cache.sql` не правится — история схемы линейна.
- **Ссылки** — плитка «разместить фото» на `/map` переведена на живой `/report` (битая кнопка
  в проде хуже, чем одна изменённая ссылка; остальной перевод карты на v2 — отдельный PR).
- **Доки** — `plan.md` (шаг PR-5), `decisions.md` (три записи от 2026-10-25), `deploy.md`
  (раздел Edge Functions, смоук `submit-report`, troubleshooting), `spec.md` (§14), `README.md`,
  `AGENTS.md`, скиллы бэкенда, ревьюер; удалён `docs/ai-test-photos.md`.

## Почему сейчас

- Сканера нет в ТЗ v2.0 — мёртвый код и мёртвая таблица мешают читать PR-3 (триаж) и PR-4 (погода).
- Ссылки на удалённые маршруты в проде давали бы 404, а `analyze-photo` оставался бы публичной
  точкой входа, которую никто не защищает и не поддерживает.
- Данные кэша не нужны: заявки живут в `reports`, фото — в бакете `report-photos`
  (`reports.photo_path`), RLS и лимиты `submit-report` не тронуты.

## Как проверено

- `npm run typecheck` — чисто; `npm run lint` — **0 ошибок** (2 известных warning:
  `use-async-data`, `locate()` в эффекте `useGeolocation`).
- `npm run test` — **139/139** (было 173: минус тесты удалённого сканера и `ai-contract`).
- `npm run build` — ок; `npm run verify:sql` — **35/35**, включая новые проверки:
  таблицы `photo_assessments` нет, грантов на неё нет, `anon` её не читает.
- `npm ci --dry-run` — lock-файл консистентен с `package.json` после удаления зависимости.
- `git grep` — в коде и доках не осталось ссылок на `analyze-photo`, `photo_assessments`,
  `src/features/scanner`, `src/features/water`, `VITE_FF_WATER_VOLUME`, `src/config/ai`
  (кроме намеренных упоминаний в исторических доках и в записях `decisions.md`).

## Критерии приёмки

- [x] житель не может попасть на `/scan` и `/water` — маршрутов нет, страницы удалены;
- [x] фото отправляется как необязательное вложение заявки (бакет `report-photos`, `photo_path`);
- [x] в проде после выкатки нет функции `analyze-photo` и таблицы `photo_assessments`;
- [x] `submit-report` продолжает работать (регресс-смоук с `contract_version: "2.0"`).

## Выкатка (после мержа)

1. Дождаться деплоя Vercel по `main` (прод <https://suutech.vercel.app>).
2. Применить миграцию на прод (`npm run db:prod:migrate` или Management API) и дописать версию
   в `supabase_migrations.schema_migrations`, как описано в `docs/deploy.md`.
3. Удалить Edge Function `analyze-photo` (`DELETE /v1/projects/{ref}/functions/analyze-photo`).
4. Проверить: `GET functions` → только `submit-report`; `count(*) photo_assessments` → ошибка
   «отношение не существует»; в бандле нет `analyze-photo`/`scanner`/`Сканер`; `/scan` и `/water` —
   маршрутов нет (SPA-фолбэк отдаёт оболочку 200, клиент рисует «Страница не найдена»); CTA главной
   ведёт на `/report`; регресс `submit-report` (POST с `contract_version: "2.0"`,
   `category: "basement_water"`, bbox `lat 42.35 / lng 76.17` → 200, затем строка удаляется
   по `client_id`).

## Проверено на проде (24.10.2026)

- **Фронт:** деплой Vercel по `main` — бандл `assets/index-Cn0VWMaL.js` совпадает с локальной
  сборкой `dist/assets/index-D-ZvK_-q.js` по размеру (237 450 Б) и по составу; хеш отличается только
  вшитыми боевыми `VITE_*`. Вхождений `analyze-photo`, `photo_assessments`, `scan`, `Сканер` — **0**;
  `water` встречается 3 раза и только в категориях/i18n (`basement_water`, `standing_water`) — это
  не удалённый раздел «Вода». В `sw.js` прекеш без чанков сканера и «Воды».
- **БД:** миграция `20261025120000` применена в `ljwyrvyzvuxauylmtosp` — `to_regclass('public.photo_assessments')`
  → `null`, версия `20261025120000` записана в `supabase_migrations.schema_migrations` (1 строка).
  `select count(*) from public.photo_assessments` → `42P01: relation "public.photo_assessments" does not exist`.
- **Edge Functions:** `GET /v1/projects/{ref}/functions` → только `submit-report` (v4, `ACTIVE`);
  `DELETE .../functions/analyze-photo` → `200`, `POST /functions/v1/analyze-photo` → `404`.
- **Регресс `submit-report`:** POST с `contract_version: "2.0"`, `category: "basement_water"`,
  точкой в bbox пилота → `200 {duplicate:false}`, `zone_id = kg-issyk-ton-ak-olong`,
  `location_adjusted_m = 0`; повторный POST того же тела → `200 {duplicate:true}` с тем же `id`;
  тестовая строка удалена по `client_id`.
- **Маршруты:** `/scan`, `/water`, `/report`, `/nope` отдают оболочку `200` (SPA-fallback по
  `vercel.json`) — в бандле маршрутов `/scan` и `/water` нет, поэтому клиент показывает
  «Страница не найдена» (как `/nope` по `docs/deploy.md`).

## Что осталось в v1.0 (следующие шаги)

Режим фермера, Premium, `zone_risk`, показ риска v1.0 на карте, legacy-колонки `reports`
(`risk_level`, `confidence`, `findings`, `recommendations`, `water_in_basement`, `well_depth_m`,
`mode`, `photo_sha256`), `status = 'reviewed'`, датчики — удаляются, когда карта перестанет их читать.

Найденное при прод-проверке (в объём PR-5 не входит, карта — это PR-2 «карта»):
`ReportPopup` и `report-row.ts` до сих пор читают v1-поля (`risk_level`, `water_in_basement`,
`well_depth_m`) из `reports_public`, поэтому новая заявка выглядит как «Без AI-оценки» —
уже отмечено в `docs/pr2-form-progress.md`. Убирать надо после перевода карточки метки на
v2-поля (`category_user`, `comment`, `immediate_danger`, `weather_snapshot`), вместе с колонками.