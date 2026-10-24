## Что меняется

Форма заявки переведена на контракт **v2.0** (ТЗ §7): заявка отправляется **без обязательного фото**,
категория выбирается жителем, есть комментарий, вопрос «есть непосредственная опасность» и честная
блокировка отправки без геопозиции.

- **Контракт** (`src/shared/types/report-contract.ts`) — zod-схема `2.0`: `category`, `comment` (≤500,
  nullable), `immediate_danger`, `point`, `gps`, `photo_path`, `weather_snapshot`, `client_id`,
  `device_hash`; сдвиг метки от GPS ≤ 300 м проверяется здесь же.
- **Форма** (`src/features/report/`) — `ReportPage` + шаги: геопозиция с перетаскиваемым пином,
  категория, комментарий, опасность, отправка. Черновик живёт в `useMemo`, кнопка объясняет,
  чего не хватает (`submissionBlock`).
- **Сервер** (`supabase/functions/submit-report/`) — валидация той же схемой, лимиты, вставка
  новых полей; словарь категорий общий с клиентом (`_shared/categories.ts`).
- **Миграция** `20261024190000_reports_v2_triage.sql` — аддитивная: новые колонки `reports`,
  `ai_triage`, `report_status_history`, статусы §12, `alerts.area`, публичное представление v2.
  Поля v1 остаются, пока `/map` не переведён.
- **Карта** — `ZoneInfoCard` получил подпись «слой-ориентир, не прогноз» (`map.zoneModelHint`).

## Как проверено

- `npm run typecheck` — чисто; `npm run lint` — 0 ошибок (2 известных warning: `use-async-data`,
  `locate()` в эффекте `useGeolocation`).
- `npm run test` — **173/173** (новые: `report-contract` 16, `report-draft` 18, `categories` — паритет
  клиент↔Deno через `?raw`, `geo` — bearing/destination/clamp).
- `npm run build` — ок; `npm run verify:sql` — **35/35** проверок миграций.
- i18n: все статические `t('…')` в `src` есть в `ru.json` (проверено скриптом).

## Критерии приёмки (ТЗ §7)

- [x] заявка без фото отправляется;
- [x] геопозиция обязательна, метку можно сдвинуть не дальше 300 м (клиент → zod → CHECK в БД);
- [x] категория из фиксированного словаря, комментарий ≤ 500 символов;
- [x] «есть непосредственная опасность» + напоминание про 112;
- [x] `client_id` наследуется из сканера, фото приходит из `analyze-photo`.

## Выкатка (после мержа)

1. применить миграцию `20261024190000_reports_v2_triage` на прод (`npm run db:prod:migrate` или
   Management API, см. `docs/deploy.md`);
2. `npx supabase functions deploy submit-report --project-ref ljwyrvyzvuxauylmtosp --use-api`;
3. смоук с телефона на `/report`: без фото, категория, пин в радиусе 300 м.

## Не в этом PR

Перевод `/map` и `/admin` на категории v2 (попап пока читает `risk_level`), погодный снимок
(PR-3, Open-Meteo), перевод `ky.json`.