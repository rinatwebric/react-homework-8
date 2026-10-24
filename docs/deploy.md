# Деплой SuuTech: Vercel + Supabase

> Деплой — **через дашборд Vercel с подключением GitHub-репозитория** (автодеплой из `main`).
> Vercel CLI не нужен и не используется.

## 1. Frontend (Vercel)

### 1.1 Загрузить код на GitHub

```bash
git add -A
git commit -m "feat(app): каркас PWA SuuTech (срез 0)"
git remote add origin https://github.com/<owner>/suutech.git   # если ещё не добавлен
git push -u origin main
```

### 1.2 Импортировать проект в Vercel

1. Открыть <https://vercel.com/new> и войти через GitHub.
2. **Import Git Repository** → выбрать репозиторий `suutech` → **Import**.
3. Настройки импорта (обычно подставляются сами, сверить):
   - **Framework Preset:** `Vite`
   - **Root Directory:** `.` (корень репозитория)
   - **Build Command:** `npm run build` (внутри `tsc -b && vite build`)
   - **Output Directory:** `dist`
   - **Install Command:** `npm ci`
   - **Node.js Version:** 22.x или 24.x (в проекте проверено на Node 24)
4. **Environment Variables** → добавить (Production **и** Preview):

   | Переменная | Значение | Когда нужна |
   |---|---|---|
   | `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | срез 1+ (после создания проекта Supabase) |
   | `VITE_SUPABASE_ANON_KEY` | publishable/anon ключ | срез 1+ |
   | `VITE_VAPID_PUBLIC_KEY` | публичный VAPID-ключ | срез 4 (push) |
   | `VITE_FF_WEATHER` | `false` | включить в срезе 3 |
   | `VITE_FF_SENSORS` | `false` | включить в срезе 3 |
   | `VITE_FF_OFFLINE` | `false` | включить в срезе 3 |
   | `VITE_FF_PUSH` | `false` | включить в срезе 4 |
   | `VITE_FF_FARMER` / `VITE_FF_PREMIUM` / `VITE_FF_KYRGYZ` | `false` | P2 |

   Срез 0 не использует Supabase в клиенте, поэтому можно нажать **Deploy** без переменных
   и добавить их позже (Settings → Environment Variables → Redeploy).
   **Секреты** (ключи моделей, `service_role`, VAPID private) в Vercel **не добавлять** — они живут
   только в секретах Edge Functions: `npx supabase secrets set ...`.
5. **Deploy**. Первый билд ~1–2 мин. Получим `https://<project>.vercel.app`.

Прод SuuTech: <https://suutech.vercel.app> (публичный). Preview-URL вида
`suutech-git-<branch>-<team>.vercel.app` закрыт Vercel Authentication (302 на SSO) — для показа
жюри и проверки с телефона брать прод-домен (или отключить Deployment Protection для preview).

Проверка, что переменные реально попали в собранный бандл (после Redeploy):

```bash
curl -s https://suutech.vercel.app/assets/index-*.js | grep -c ljwyrvyzvuxauylmtosp
```

`0` → `VITE_SUPABASE_*` не заданы для Production (или не было передеплоя).

### 1.3 Автодеплой

- Пуш в `main` → production-деплой; пул-реквест → preview-URL.
- `vercel.json` уже содержит:
  - SPA-fallback: пути без точки (`/report`, `/map`, `/admin`, `/404`) отдают `index.html`,
    а файлы (`/sw.js`, `/manifest.webmanifest`, `/assets/*`) — как есть;
  - `Cache-Control: must-revalidate` для `/sw.js` (иначе браузер застрянет на старом SW);
  - `immutable`-кэш для `/assets/*` (хэш в имени файла);
  - `Content-Type: application/manifest+json` для манифеста.
- HTTPS и домен `*.vercel.app` — автоматически. **PWA ставится только по HTTPS**
  (по локальному `http://192.168.x.x:5173` install-промпта не будет — это не secure context).

### 1.4 Частая ошибка сборки на Vercel: платформенный бинарь в `devDependencies`

`npm ci` на Linux падает, если в `devDependencies` лежит пакет только для Windows
(например, `@rolldown/binding-win32-x64-msvc`): `EBADPLATFORM … wanted {os:"win32"}`.
Такой пакет не добавляем руками — нужные бинарники приходят через `optionalDependencies`
(`lightningcss`, `rolldown`). Если локально на Windows падает `require('lightningcss')`,
лечим переустановкой (`npm install --prefer-online`), а не правкой `package.json`.

## 2. Backend (Supabase) — миграция

Docker в рабочей среде нет, поэтому локальный стек не поднимаем (проверка SQL —
`npm run verify:sql`, Postgres в WASM). Миграция применяется к облачному проекту:

```bash
npx supabase login                       # интерактивно, один раз
npx supabase link --project-ref <ref>    # ref из URL проекта в дашборде
npx supabase db push                     # применит supabase/migrations/*.sql
```

Проект SuuTech: `ljwyrvyzvuxauylmtosp` → `https://ljwyrvyzvuxauylmtosp.supabase.co`
(дашборд: <https://supabase.com/dashboard/project/ljwyrvyzvuxauylmtosp>).
`login` нужен под тем аккаунтом, у которого есть доступ к этому проекту: чужой аккаунт в CLI
даёт `Cannot find project ref` и пустой список проектов.

После пуша — перегенерировать типы и заменить файл, написанный руками:

```bash
npx supabase gen types typescript --project-id <ref> > src/shared/types/database.ts
```

Создать проект: <https://supabase.com/dashboard> → **New project** (регион — ближайший, например
Frankfurt). Ключи: **Project Settings → API** → `Project URL` и `anon`/`publishable key` —
их и положить в `.env.local` и в переменные Vercel.

## 3. Проверка на телефоне (срез 0)

1. Открыть `https://<project>.vercel.app` на телефоне → главный экран с кнопками.
2. **Android/Chrome:** меню → «Установить приложение» (или баннер установки). Иконка — на рабочем столе.
3. **iOS/Safari:** «Поделиться» → «На экран Домой».
4. Запустить с иконки: нет адресной строки (standalone).
5. Авиарежим → открыть приложение → оболочка открывается из precache.
6. Chrome DevTools (remote debugging) → **Application**: Manifest без ошибок, Service Worker `activated`.
7. Открыть `/map` напрямую по ссылке (deep link) — маршрут работает (SPA-fallback).
8. Открыть `/nope` — экран «Страница не найдена», не белый экран.

## 4. Проверка RLS (обязательно от роли `anon`)

В **SQL Editor** Supabase запрос по умолчанию идёт от `postgres` — он обходит RLS, такая
проверка ничего не доказывает. Переключаем роль:

```sql
set role anon;

-- должно работать: публичное представление с округлёнными координатами
select id, lat_public, lng_public, risk_level, status from public.reports_public limit 5;

-- должно упасть с «permission denied for table reports»
select lat, lng, device_hash from public.reports limit 1;
```

Альтернатива через REST (тот же anon-ключ, что в клиенте):

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "https://<ref>.supabase.co/rest/v1/reports?select=lat" \
  -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>"
# ожидаем 401/403, а не 200

curl -s \
  "https://<ref>.supabase.co/rest/v1/reports_public?select=id,lat_public&limit=1" \
  -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>"
# ожидаем 200 и только округлённые координаты
```

Вернуть права Postgres: `reset role;`

Проверить бакет: **Storage** → есть `report-photos`, лимит файла 2 MB, MIME только изображения.

## 5. Edge Functions

1. Секреты функций — **только в Supabase**, Vercel их не видит:

   ```bash
   npx supabase secrets set IP_HASH_SALT=<случайная строка>
   ```

   `IP_HASH_SALT` — «перец» для хэша IP в `submit-report` (адрес не хранится). Если переменная
   не задана, для хэша берётся `service_role`-ключ — он и так только на сервере.
   Ключи моделей появятся вместе с `classify-report` (PR-4).

   ⚠️ Ключ нельзя хранить в переменных Vercel: с префиксом `VITE_` Vite вшивает его в публичный
   JS-бандл (ключ увидит любой, кто откроет DevTools), без префикса клиент его не читает, а Edge
   Function всё равно получает только секреты Supabase. Если ключ уже добавлен в Vercel —
   удалить переменную и **перевыпустить ключ** у провайдера модели.

   **Если CLI отвечает 403** `Your account does not have the necessary privileges to access this endpoint`
   — это не про права внутри проекта, а про **другой аккаунт в CLI**:

   ```bash
   npx supabase projects list                       # видно ли ljwyrvyzvuxauylmtosp?
   Get-Content supabase/.temp/linked-project.json   # кто владелец проекта (organization_id)
   ```

   Секреты и деплой требуют роли Owner/Admin. Аккаунт сменяется входом в браузере
   (`npx supabase login`) или personal access token
   (<https://supabase.com/dashboard/account/tokens> → `$env:SUPABASE_ACCESS_TOKEN='sbp_…'`).
   Альтернатива без CLI — **Dashboard → Project Settings → Edge Functions → Secrets** (значения
   видны только на запись, прочитать их потом нельзя).

3. Деплой функции:

   ```bash
   npx supabase functions deploy submit-report
   ```

   `verify_jwt` оставляем включённым (по умолчанию): клиент шлёт anon-ключ в `Authorization`.

   **Рабочая связка без Docker и без `supabase login`** (проверено 2026-10-24 на `submit-report`):
   токен владельца в переменной окружения, бандл собирается в облаке, пароль БД не нужен.

   ```powershell
   $env:SUPABASE_ACCESS_TOKEN = 'sbp_…'   # PAT владельца (Account → Access Tokens), в файл не сохранять
   npx supabase link --project-ref ljwyrvyzvuxauylmtosp --yes
   npx supabase functions deploy submit-report --project-ref ljwyrvyzvuxauylmtosp --use-api --yes
   ```

   - `--use-api` — бандлинг на стороне Supabase (без Docker); уходят `index.ts` и все `_shared/*.ts`.
   - Прогресс («Uploading asset …») CLI пишет в **stderr**, поэтому PowerShell рисует `NativeCommandError`
     и «exit code 1» даже при успехе. Настоящий код возврата смотреть так:
     `cmd /c "npx supabase functions deploy … > out.txt 2> err.txt"`; успех — строка
     `Deployed Functions on project <ref>: <name>`.
   - Особенность CLI 2.122 с PAT: `projects list` и `db push` падают с «Cannot find project ref. Have you run
     supabase link?», хотя `link` и `functions deploy` работают. Миграцию без пароля БД применять через
     Management API (тот же путь, что у MCP `apply_migration`):

   ```powershell
   $sql = Get-Content supabase/migrations/<file>.sql -Raw -Encoding UTF8
   $rec = "`ninsert into supabase_migrations.schema_migrations (version, name) values ('<version>','<name>') on conflict (version) do nothing;"
   $body = @{ query = ($sql + $rec) } | ConvertTo-Json -Compress
   Invoke-RestMethod -Method Post -ContentType 'application/json; charset=utf-8' `
     -Uri "https://api.supabase.com/v1/projects/<ref>/database/query" `
     -Headers @{ Authorization = "Bearer $env:SUPABASE_ACCESS_TOKEN" } `
     -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
   ```

   Без строки в `schema_migrations` следующий `db push` попробует применить миграцию повторно.

3. Smoke-тест `submit-report`:

   ```bash
   curl -s -X POST "https://<ref>.supabase.co/functions/v1/submit-report" \
     -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>" \
     -H "Content-Type: application/json" \
     -d '{"contract_version":"2.0","client_id":"<uuid-v4>","device_hash":"<64-hex>",
          "category":"basement_water","comment":null,"immediate_danger":false,
          "point":{"lat":42.35,"lng":76.17},"gps":{"lat":42.35,"lng":76.17,"accuracy_m":8},
          "photo_path":null,"weather_snapshot":null}'
   # 200 → { "id": "...", "duplicate": false }; повторить с тем же client_id → "duplicate": true, второй строки нет
   ```

   Тело — `SubmitReportRequest` из `supabase/functions/_shared/report-schema.ts`. 400 `INVALID_INPUT` — тело
   не по схеме, в т.ч. `photo_path` не в папке своего `client_id`; 429 `RATE_LIMITED` — больше 10 отчётов в час
   с одного `device_hash` или 30 с одной сети (хэш IP). Координаты и хэши в лог не пишутся — только пути полей.
   Миграцию применить **до** первого вызова, любой из вариантов:

   - `npx supabase db push --linked` — если CLI залогинен под владельцем проекта;
   - `npx supabase db push --password <db-password>` (или `--db-url "postgresql://postgres.<ref>:<pwd>@...:5432/postgres"`) —
     если пароль БД под рукой: в `supabase/.temp/pooler-url` пароля **нет**, только хост и пользователь;
   - SQL Editor в Dashboard: вставить `supabase/migrations/20261024120000_report_submit.sql` целиком;
   - Supabase MCP в Cline (`~/.cline/data/settings/cline_mcp_settings.json`, сервер `supabase`,
     `type: streamableHttp`, `url` с `project_ref`): авторизация OAuth под владельцем проекта, затем
     `apply_migration` + `deploy_edge_function` из чата. Правило `AGENTS.md` — MCP только `read_only=true`,
     доступ на запись включается на одну сессию деплоя и сразу снимается (см. `docs/decisions.md`).

## 6. Откат / типовые проблемы

| Симптом | Причина | Что делать |
|---|---|---|
| Ссылка `/report` отдаёт 404 | нет SPA-fallback | проверить `vercel.json` (rewrites) и Redeploy |
| После деплоя старая версия | SW кэширует | `/sw.js` должен отдаваться с `must-revalidate`; закрыть вкладку/переустановить PWA |
| Нет кнопки «Установить» | открыто по HTTP или уже установлено | только HTTPS; Chrome показывает баннер не всегда — меню «Установить приложение» |
| Билд падает на `tsc -b` | ошибка типов | локально `npm run build` и починить до пуша |
| `secrets set` / `functions deploy` / `db push` (login role): 403 «does not have the necessary privileges» | CLI залогинен под другим аккаунтом (`projects list` не показывает проект) | `npx supabase login` под владельцем проекта, `link --project-ref <ref>`, либо задать секреты в Dashboard → Edge Functions → Secrets, а миграцию вставить в SQL Editor |
| Edge Function отвечает 401/403 | в клиенте неверный `VITE_SUPABASE_ANON_KEY` или функция задеплоена с `verify_jwt` и без заголовка | сверить ключ в переменных Vercel и заголовки `apikey`/`Authorization` |