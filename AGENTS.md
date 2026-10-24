# SuuTech — инструкции для AI-агентов

> Читается автоматически: Codex, Cursor, Hoplite, Copilot (`AGENTS.md`); Claude Code — через `CLAUDE.md`.
> Полное ТЗ: `docs/spec.md` (версия 2.0 от 24.10.2026). План и PR: `docs/plan.md`. Решения: `docs/decisions.md`.
> Держи этот файл ≤ 200 строк.

## WHY — что за продукт
SuuTech — мобильное PWA, где житель за секунды отправляет геопривязанный сигнал о воде или сырости
(вода в подвале, сырая стена, стоячая вода, водоотвод, колодец), а местная администрация видит карту
повторяющихся проблем, AI-триаж и статус проверки. Пилот — село Ак-Өлөң (Иссык-Кульская область).
Цикл ценности: заявка жителя → AI-предложение категории и срочности → решение модератора → статус → устранение.
Хакатон Logos (команда SuuTech). **Жюри оценивает то, что работает на сцене с телефона.**

Честность (нарушение = блокер):
- AI **не** ставит диагноз по фото и **не** измеряет грунтовые воды — он сортирует заявки для админки.
- Карта не предсказывает подтопление. Слой областей/районов — ориентир «где мы», подписан «не прогноз».
- SuuTech **не заменяет 112**: при опасности UI ведёт на звонок, заявка не обещает экстренного реагирования.
- Демо-данные и симуляции всегда подписаны (`is_demo`), их нельзя выдавать за реальные наблюдения.

Приоритеты: **P0** форма без обязательного фото, обязательная геопозиция с радиусом 300 м, карта пилота,
погода, админка со статусами, кнопка 112 → **P1** офлайн-очередь, необязательное фото, AI-триаж, push/баннер,
кыргызские подписи → **P2** прогноз зонального риска, датчики, интеграции, аналитика, APK/Premium/фермер.
Не делай P(n+1), пока P(n) не работает с телефона.

## Категории, срочность и статусы (единые для всего проекта)
Категории (значение → ru): `basement_water` вода в подвале, `damp_wall` сырая стена, `standing_water`
стоячая вода, `drainage_issue` водоотвод/арык, `well_level` колодец, `road_flooding` вода на дороге,
`other` другое.
Срочность: `low` | `medium` | `high` | `critical` — внутренняя шкала админки, жителю не показываем.
Статусы: `new` → `triaged` → `assigned` → `in_progress` → `resolved` | `rejected`, плюс история переходов.
`reviewed` остался от v1.0 и удаляется отдельным PR.
Справочники, подписи и маппинги — одна константа/чистая функция в `src/shared/lib/categories.ts`
(+ копия в `supabase/functions/_shared/` для Edge Functions). Дублировать словари по компонентам нельзя.

## WHAT — стек и структура
- Frontend: React 19 + Vite + **TypeScript (strict)** + Tailwind CSS v4 (`@tailwindcss/vite`) + React Router 7,
  `vite-plugin-pwa` (`injectManifest`, свой `src/sw.ts`), `react-leaflet` + `react-leaflet-cluster`,
  `idb`, `i18next`/`react-i18next`, `zod`, `browser-image-compression`.
- Backend: Supabase — Postgres + RLS, Auth (только модераторы), Storage, Edge Functions (Deno).
- Функции v2.0: `submit-report`, `classify-report`, `weather-current`, `send-alert`. Легаси `analyze-photo`
  удаляется вместе с AI-сканером.
- Внешнее: Open-Meteo (без ключа), тайлы OSM, vision/LLM — ключ только в секретах функций,
  границы областей/районов — geoBoundaries (ODbL / CC BY-SA, нужна атрибуция).
- Деплой: Vercel (frontend), Supabase Cloud (backend). Линтер: oxlint.

Целевая структура:
```
src/
  app/            роутер, layout, error boundary, провайдеры
  features/       home/ report/ map/ admin/ offline/ push/ weather/
  shared/         ui/ (кнопки, баннеры, состояния), lib/ (supabase, geo, image, i18n, categories), types/
  config/         features.ts (флаги), pilot.ts (центр и bbox пилота)
  locales/        ru.json, ky.json
  sw.ts           service worker: precache, тайлы, push, sync
public/geo/       упрощённые GeoJSON областей/районов (только для слоя-ориентира)
scripts/          verify-migration.mjs (PGlite-проверка миграций)
supabase/
  migrations/     только SQL-миграции, никаких правок схемы руками в Dashboard
  functions/      _shared/ (cors, zod-схемы, AI-контракт) + функции выше
```

## Команды (Windows PowerShell, из корня `react-homework-8`)
```powershell
npm ci                 # чистая установка; после npm install проверь, что optional deps не сломались
npm run dev            # http://localhost:5173
npm run build          # typecheck + прод-сборка (проверяет и SW)
npm run typecheck      # tsc -b
npm run lint           # oxlint, цель — 0 ошибок
npm run test           # vitest run (юнит-тесты чистой логики)
npm run verify:sql     # миграции на PGlite + проверки RLS/прав/CHECK — без Docker
npx supabase migration new <name>       # новая миграция
npx supabase functions deploy <name>    # деплой функции
```
Docker на машине нет, поэтому `npx supabase start`/`db reset` локально не запускаются —
схему проверяем через `npm run verify:sql`, прод — через Management API (см. «Безопасность»).

## Рабочий процесс (обязателен)
1. **Вертикальный срез.** Одна задача = одна проверяемая на телефоне функция (UI + API + БД).
2. **Перед кодом** — короткий план: какие файлы создашь/изменишь и как проверить. Если требование
   неясно — предложи вариант, запиши в `docs/decisions.md` и продолжай.
3. **После кода** — `npm run verify:sql` (если менялись миграции), затем
   `npm run build && npm run lint && npm run test`, затем инструкция «как проверить руками».
4. Отметь прогресс в `docs/plan.md`. Маленькие коммиты в стиле `feat(report): ...`, `fix(map): ...`.
5. Не добавляй фич, которых нет в ТЗ. Не меняй стек и не ставь крупные зависимости без объяснения.
6. Баг: сначала гипотезы и минимальная проверка причины, потом фикс. Никаких «на всякий случай» правок.
7. **Миграции только аддитивные, пока идёт переход на v2.0.** Удаление колонок/таблиц v1.0 и переименования —
   отдельным PR после перевода фронтенда, иначе прод-версия ломается на глазах у жюри.

## Правила кода
- TypeScript strict, без `any`. Данные извне (AI, API, IndexedDB, формы) валидируются `zod`.
- Каждый экран: состояния loading / error / empty. Error boundary на роутах — **никогда белого экрана**.
- Mobile-first от 360 px, крупные кнопки (≥ 48 px). Категория и срочность показываются **цветом + иконкой + текстом**.
- Главный CTA — лаймовый (`--color-lime` + текст `--color-on-lime`), карточки и сайдбар `/admin` —
  «чернильные» (`--color-ink`). Лайм не используем для категорий и срочности.
  Дизайн-токены — в `@theme` (Tailwind v4) в `src/index.css`; иконки — SVG (lucide), не эмодзи.
- Все тексты интерфейса — через `t('...')`, ключи в `src/locales/ru.json` (+ `ky.json`). Без хардкода.
  Кыргызский перевод не выдумывай: оставь `TODO-ky`-ключи списком в PR для проверки носителем языка.
- Ленивая загрузка: `/map` и `/admin` — `React.lazy`; Leaflet, его CSS и GeoJSON только в чанке карты.
  Бюджет основного маршрута ≈ 200 КБ gzip.
- Нестабильные функции — за флагом в `src/config/features.ts` (`VITE_FF_*`), по умолчанию выключены.
- Компоненты маленькие; логика (сжатие, очередь, расстояние по GPS, ограничение 300 м, округление
  координат, категории) — чистые функции с тестами в `*.test.ts` рядом.
- GPS: только реальный `navigator.geolocation`, без «демо-координат по умолчанию». Радиус 300 м
  проверяется и на клиенте, и в `submit-report` (`location_adjusted_m ≤ 300`), и CHECK-констрейнтом в БД.

## Безопасность и приватность (нарушение = блокер)
- Ключи vision/LLM, `service_role`/secret key, VAPID private — **только** в секретах Edge Functions.
  В клиенте только `VITE_SUPABASE_URL`, публичный (anon/publishable) ключ, VAPID public key.
- `.env*` не коммитить и не читать без просьбы; образец — `.env.example`.
- RLS включён на всех таблицах. Права модератора проверяются в БД/функциях, а не в UI.
- Публично — только округлённые (~100 м) координаты, без `device_hash`, `created_by`, `moderator_note`
  и без `ai_triage`. Точные координаты — только модераторам. Всё это зафиксировано в view `reports_public`
  и проверяется в `npm run verify:sql`.
- Фото: сжатие + удаление EXIF на клиенте, проверка MIME и размера на сервере, предупреждение «не снимайте людей».
- **Прод разрешён владельцем** (2026-10-24, хакатонный проект): агент может применять миграции к прод-проекту
  `ljwyrvyzvuxauylmtosp` (Management API → `POST /v1/projects/{ref}/database/query`) и мержить PR
  (`gh pr merge <n> --squash`, стиль репозитория). Границы: `.env*` не читать и не коммитить, ключи — только
  в секретах, `drop table` / `truncate` / массовые `delete` на проде сначала согласовать; после DDL вставить
  версию в `supabase_migrations.schema_migrations`. Supabase MCP — всё ещё `read_only`, пишем через Management API.

## Скиллы проекта (`.agents/skills/`, копия в `.claude/skills/`)
Загружай подходящий скилл **до** начала работы над областью:
| Область | Скилл |
|---|---|
| AI-триаж: промпт, контракт JSON, дубликаты, `classify-report` | `suutech-triage` |
| Схема БД, RLS, миграции, Edge Functions, Storage | `suutech-backend` + `supabase` + `supabase-postgres-best-practices` |
| Геопозиция, радиус 300 м, карта пилота, фильтры, слой областей | `suutech-map-geo` |
| Open-Meteo, погода и прогноз на 3 дня, баннер, расписание | `suutech-weather` |
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
Скилл `suutech-sensors` удалён вместе с датчиками (ТЗ v2.0 §18); `suutech-ai-scanner` заменён на `suutech-triage`.

## Definition of Done для PR
- [ ] `npm run verify:sql` — все проверки пройдены (если были миграции).
- [ ] `npm run build`, `npm run lint` (0 ошибок), `npm run test` — зелёные.
- [ ] Проверено руками на 360 px в Chrome DevTools и, если возможно, на телефоне.
- [ ] Обновлены `docs/plan.md` и, при выборе между вариантами, `docs/decisions.md`.
- [ ] Нет секретов в диффе; миграция аддитивная и идемпотентная (`if not exists` / `drop ... if exists`).