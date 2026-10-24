# SuuTech

Мобильное PWA о подтоплениях в селе (Кыргызстан, пилот — Ак-Өлөң, Иссык-Куль).
Заявка жителя с геопозицией → карта проблем → срочность и статусы в `/admin` → предупреждения.

> ТЗ v2.0 — [`docs/spec.md`](docs/spec.md), план PR-1…PR-5 — [`docs/plan.md`](docs/plan.md),
> журнал решений — [`docs/decisions.md`](docs/decisions.md), питч — [`docs/pitch.md`](docs/pitch.md),
> инструкции для агентов — [`AGENTS.md`](AGENTS.md).
>
> Работа идёт по PR-1…PR-5 (`docs/plan.md`). Схема БД уже v2.0 (аддитивная миграция), интерфейс ещё
> догоняет ТЗ: часть экранов v1.0 (`scanner`, `water`) удаляется в PR-5.

## Стек

React 19 · Vite 8 · TypeScript (strict) · Tailwind CSS v4 · React Router 7 · vite-plugin-pwa
(`injectManifest`, свой `src/sw.ts`) · i18next · zod · lucide · Supabase (Postgres + RLS,
Storage, Edge Functions) · Vercel.

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # заполнить позже, для среза 0 не обязательно
npm run dev                  # http://localhost:5173
```

| Команда | Что делает |
|---|---|
| `npm run dev` | dev-сервер (PWA-оболочка работает и в dev) |
| `npm run build` | `tsc -b` + `vite build` (сборка SW и манифеста) |
| `npm run typecheck` | только типы |
| `npm run lint` | oxlint |
| `npm run test` | vitest (чистая логика) |
| `npm run preview` | собранное приложение + реальный SW |
| `npm run assets` | иконки PWA из `public/logo.svg` |
| `npm run verify:sql` | прогон миграций и RLS в Postgres-WASM (без Docker) |

## Структура

```
src/app/        роутер, layout, error boundary, регистрация SW
src/features/   home, report, map, admin (v1.0: scanner, water — до PR-5)
src/shared/     ui/ (кнопки, карточки, состояния, бейдж срочности), lib/ (i18n, cx), types/ (контракты, database)
src/config/     features.ts (флаги), pilot.ts (пилотная зона), report.ts (категории/срочность), map.ts, ai.ts, demo.ts
src/locales/    ru.json, ky.json
supabase/       migrations/, functions/ (analyze-photo — v1.0, submit-report, _shared)
scripts/        verify-migration.mjs
docs/           spec.md, plan.md, decisions.md, pitch.md, deploy.md, AI_GUIDE.md
```

## Установка на телефон

PWA ставится **только по HTTPS**: локальный `http://192.168.x.x:5173` для установки не подходит
(не secure context). Деплой и проверка — [`docs/deploy.md`](docs/deploy.md).