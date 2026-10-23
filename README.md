# SuuTech

Мобильное PWA о риске подземного подтопления (Кыргызстан, пилот — село Ак-Өлөң, Иссык-Куль).
Сигнал → риск зоны → предупреждение жителям → действия служб в `/admin`.

> Полное ТЗ — [`docs/spec.md`](docs/spec.md), план срезов — [`docs/plan.md`](docs/plan.md),
> журнал решений — [`docs/decisions.md`](docs/decisions.md), инструкции для агентов — [`AGENTS.md`](AGENTS.md).

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
src/features/   home, scanner, map, admin
src/shared/     ui/ (кнопки, карточки, состояния, бейдж риска), lib/ (i18n, risk, cx), types/
src/config/     features.ts (флаги), pilot.ts (пилотная зона), risk.ts (уровни риска)
src/locales/    ru.json, ky.json
supabase/       migrations/, config.toml
scripts/        verify-migration.mjs
docs/           spec.md, plan.md, decisions.md, deploy.md, AI_GUIDE.md
```

## Установка на телефон

PWA ставится **только по HTTPS**: локальный `http://192.168.x.x:5173` для установки не подходит
(не secure context). Деплой и проверка — [`docs/deploy.md`](docs/deploy.md).