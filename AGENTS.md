# SuuTech — инструкции для AI-агентов

> Читается автоматически: Codex, Cursor, Hoplite, Copilot (`AGENTS.md`); Claude Code — через `CLAUDE.md`.
> Полное ТЗ: `docs/spec.md`. План и статус срезов: `docs/plan.md`. Держи этот файл ≤ 200 строк.

## WHY — что за продукт
SuuTech — мобильное PWA о подземном подтоплении для всего Кыргызстана (пилот — 3–5 сёл, начиная с Ак-Өлөң,
Иссык-Куль). Проблему сегодня обнаруживают слишком поздно; SuuTech превращает её в измеряемые данные и заранее
предупреждает о риске. Цикл: сигнал → риск зоны → предупреждение жителям → действия служб в `/admin`.
Хакатон Logos (команда SuuTech). **Жюри оценивает то, что работает на сцене с телефона.**

Три источника сигнала:
1. **Жители:** фото сырости → предварительная AI-оценка + «вода в подвале?» + глубина воды в колодце.
2. **Погода и влажность почвы** (Open-Meteo) — по всей стране (сетка центров районов) и по точке пользователя.
3. **Датчики** (в демо — симулятор, помечен `is_simulated`; настоящий ESP32 — бонус).

Честность (нарушение = блокер): AI по фото **не измеряет** грунтовые воды и не ставит диагноз — фото
показывает последствия, AI даёт подсказку, решение за человеком. Центр демо и питча — рабочий цикл
«фото/вода в подвале → точка на карте → статус у властей», он работает даже без AI. Подробнее — `docs/pitch.md`.
Риск считается **пороговыми правилами, не ML** (ML — только дорожная карта). Симуляция и демо-данные всегда подписаны.
Объём воды — только для пилотной зоны и с подписью «оценка, не измерение».

Приоритеты: **P0** сканер+AI, обязательная геопозиция, карта, HTTPS-PWA → **P1** погода+влажность почвы,
`/admin`, офлайн-очередь, Web Push, слой датчиков с симулятором → **P2** фермер, Premium-симуляция, кыргызский,
антифейк, оценка объёма воды → **P3** APK, heatmap, настоящий ESP32. Не делай P(n+1), пока P(n) не работает с телефона.

## Уровни риска (единые для всего проекта)
| Зона / датчик / погода | Цвет | Отчёт жителя (AI `risk_level`) |
|---|---|---|
| `normal` — норма | голубой | `low` |
| `elevated` — повышенный | янтарный | `medium` |
| `high` — высокий | коралловый | `high` |
| `critical` — критический | тёмно-красный | — (только правила зоны/датчиков) |
Маппинг — одна чистая функция в `src/shared/lib/risk.ts` (+ копия в `supabase/functions/_shared/`).

## WHAT — стек и структура
- Frontend: React 19 + Vite 8 + **TypeScript (strict)** + Tailwind CSS v4 (`@tailwindcss/vite`) + React Router 7,
  `vite-plugin-pwa` (стратегия `injectManifest`, свой `src/sw.ts`), `react-leaflet` 5 + `react-leaflet-cluster`,
  `idb`, `i18next`/`react-i18next`, `zod`, `browser-image-compression`.
- Backend: Supabase — Postgres + RLS, Auth (только модераторы), Storage, Edge Functions (Deno).
- Функции: `analyze-photo`, `submit-report`, `weather-check`, `ingest-sensor`, `compute-zone-risk`,
  `send-push`, `subscribe-push`.
- Внешнее: vision-модель (ключ только в секретах функций), Open-Meteo (без ключа), тайлы OSM,
  границы областей/районов — geoBoundaries (ODbL / CC BY-SA, нужна атрибуция).
- Деплой: Vercel (frontend), Supabase Cloud (backend). Линтер: oxlint.

Целевая структура (создаётся в срезе 0; текущий код блога из урока удаляется):
```
src/
  app/            роутер, layout, error boundary, провайдеры
  features/       scanner/ report/ map/ water/ weather/ sensors/ admin/ offline/ push/ farmer/ premium/
  shared/         ui/ (кнопки, баннеры, состояния), lib/ (supabase, geo, image, i18n, risk), types/
  config/         features.ts (флаги), pilot.ts (центр, bbox пилота), risk.ts (пороги)
  locales/        ru.json, ky.json
  sw.ts           service worker: precache, тайлы, push, sync
public/geo/       упрощённые GeoJSON областей/районов (грузятся только картой)
scripts/          simulate-sensors.ts (симулятор датчиков для демо)
supabase/
  migrations/     только SQL-миграции, никаких правок схемы руками в Dashboard
  functions/      _shared/ (cors, zod-схемы, ai-контракт, правила риска) + по папке на функцию
docs/             spec.md, plan.md, AI_GUIDE.md, decisions.md
```

## HOW — команды
```bash
npm run dev          # локально (PWA в dev: devOptions.enabled)
npm run build        # tsc + vite build — должен проходить перед каждым коммитом
npm run lint         # oxlint
npm run test         # vitest (чистая логика)
npm run preview      # проверка собранного PWA/SW
npm run simulate     # симулятор датчиков (после среза 3)
npx supabase start -x vector            # локальный Supabase (нужен Docker)
npx supabase migration new <name>       # новая миграция
npx supabase db reset                   # применить миграции локально
npx supabase functions serve            # функции локально
npx supabase functions deploy <name>    # деплой функции
```
Если скрипта ещё нет в `package.json` — добавь его в рамках текущего среза.

## Рабочий процесс (обязателен)
1. **Вертикальный срез.** Одна задача = одна проверяемая на телефоне функция (UI + API + БД).
2. **Перед кодом** — короткий план: какие файлы создашь/изменишь и как проверить. Если требование
   неясно — предложи вариант, запиши в `docs/decisions.md` и продолжай.
3. **После кода** — `npm run build && npm run lint && npm run test`, затем инструкция «как проверить руками».
4. Отметь прогресс в `docs/plan.md`. Маленькие коммиты в стиле `feat(scanner): ...`, `fix(map): ...`.
5. Не добавляй фич, которых нет в ТЗ. Не меняй стек и не ставь крупные зависимости без объяснения.
6. Баг: сначала гипотезы и минимальная проверка причины, потом фикс. Никаких «на всякий случай» правок.

## Правила кода
- TypeScript strict, без `any`. Данные извне (AI, API, датчики, IndexedDB, формы) валидируются `zod`.
- Каждый экран: состояния loading / error / empty. Error boundary на роутах — **никогда белого экрана**.
- Mobile-first от 360 px, крупные кнопки (≥ 48 px), риск показывается **цветом + иконкой + текстом**.
- Цвета риска (голубой → янтарный → коралловый → тёмно-красный) — только для шкалы риска. Главный CTA —
  лаймовый (`--color-lime` + текст `--color-on-lime`), карточки риска и сайдбар `/admin` — «чернильные»
  (`--color-ink`). Лайм не используем для уровней риска.
  Дизайн-токены — в `@theme` (Tailwind v4) в `src/index.css`; иконки — SVG (lucide), не эмодзи.
- Все тексты интерфейса — через `t('...')`, ключи в `src/locales/ru.json` (+ `ky.json`). Без хардкода.
  Кыргызский перевод не выдумывай: оставь `TODO-ky`-ключи списком в PR для проверки носителем языка.
- Ленивая загрузка: `/map` и `/admin` — `React.lazy`; Leaflet, его CSS и GeoJSON только в чанке карты.
  Бюджет основного маршрута ≈ 200 КБ gzip.
- Нестабильные функции — за флагом в `src/config/features.ts` (`VITE_FF_*`), по умолчанию выключены.
- Компоненты маленькие; логика (сжатие, очередь, правила риска, округление координат) — чистые функции с тестами.
- Пороги риска — только в конфиге, подписаны как стартовые, калибруются на данных пилота.

## Безопасность и приватность (нарушение = блокер)
- Ключи vision-API, `service_role`/secret key, VAPID private — **только** в секретах Edge Functions.
  В клиенте только `VITE_SUPABASE_URL`, публичный (anon/publishable) ключ, VAPID public key.
- Ключи датчиков: в БД только хэш (`api_key_hash`), у `ingest-sensor` лимит частоты на датчик.
- `.env*` не коммитить и не читать без просьбы; образец — `.env.example`.
- RLS включён на всех таблицах. Права модератора проверяются в БД/функциях, а не в UI.
- Публично — только округлённые (~100 м) координаты, без `device_hash`. Точные — только модераторам.
- Фото: сжатие + удаление EXIF на клиенте, проверка MIME и размера на сервере, предупреждение «не снимайте людей».
- Агент не подключается к продакшен-БД на запись. Supabase MCP — в режиме `read_only`.

## Скиллы проекта (`.agents/skills/`, копия в `.claude/skills/`)
Загружай подходящий скилл **до** начала работы над областью:
| Область | Скилл |
|---|---|
| Срез 1: фото → AI-оценка, промпт, контракт JSON | `suutech-ai-scanner` |
| Схема БД, RLS, миграции, Edge Functions, Storage | `suutech-backend` + `supabase` + `supabase-postgres-best-practices` |
| Геопозиция, карта страны, зоны, метки, фильтры | `suutech-map-geo` |
| Датчики, `ingest-sensor`, симулятор, риск зон, объём воды | `suutech-sensors` |
| Open-Meteo, влажность почвы, баннер, расписание | `suutech-weather` |
| Service worker, офлайн-очередь, кэш тайлов | `suutech-offline-pwa` |
| Web Push, VAPID, подписки | `suutech-web-push` |
| Флаги, заморозка, демо, приёмка | `suutech-demo-readiness` |
| Дизайн-система, палитра, шрифты, UX-правила | `ui-ux-pro-max` → `tailwind-design-system` |
| Новый экран / внешний вид | `frontend-design` |
| Ревью UI, доступность | `web-design-guidelines` |
| Производительность React | `vercel-react-best-practices`, `vercel-composition-patterns` |
| E2E-проверка в браузере | `webapp-testing` (Playwright) |
| Деплой / слайды | `deploy-to-vercel` / `pptx` |
| Нужен новый скилл | `find-skills`, `skill-creator` |

Список внешних скиллов зафиксирован в `skills-lock.json`; обновление: `npx skills update -p`.
