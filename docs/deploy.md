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
   | `VITE_FF_FARMER` / `VITE_FF_PREMIUM` / `VITE_FF_KYRGYZ` / `VITE_FF_WATER_VOLUME` | `false` | P2 |

   Срез 0 не использует Supabase в клиенте, поэтому можно нажать **Deploy** без переменных
   и добавить их позже (Settings → Environment Variables → Redeploy).
   **Секреты** (vision-ключ, `service_role`, VAPID private) в Vercel **не добавлять** — они живут
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
  - SPA-fallback: пути без точки (`/scan`, `/map`, `/water`, `/admin`, `/404`) отдают `index.html`,
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

## 5. AI-сканер (срез 1)

1. Миграция кэша оценок идёт вместе с остальными: `npx supabase db push`
   (создаёт `photo_assessments`; RLS включён, политик нет — таблицу читает/пишет только функция).

2. Секреты функции — **только в Supabase**, Vercel их не видит:

   ```bash
   npx supabase secrets set VISION_API_KEY=<ключ Google AI Studio> VISION_MODEL=gemini-3.5-flash-lite
   ```

   ⚠️ Ключ нельзя хранить в переменных Vercel: с префиксом `VITE_` Vite вшивает его в публичный
   JS-бандл (ключ увидит любой, кто откроет DevTools), без префикса клиент его не читает, а Edge
   Function всё равно получает только секреты Supabase. Если ключ уже добавлен в Vercel —
   удалить переменную и **перевыпустить ключ** у провайдера модели.

   `VISION_MODEL` можно не задавать — функция возьмёт `gemini-3.5-flash-lite` по умолчанию
   (`supabase/functions/_shared/vision.ts`). Провайдер — Gemini, ключ из
   <https://aistudio.google.com/apikey> (новые ключи имеют вид `AQ.…`, старые — `AIza…`; оба
   передаются заголовком `x-goog-api-key`). Ключ без модели = 503 `NOT_CONFIGURED`.

   Выбор модели проверен на живом ключе (окт. 2026):

   | Модель | Ответ на фото |
   |---|---|
   | `gemini-3.5-flash-lite` | 200 за 1–3 с, JSON по схеме — **дефолт** |
   | `gemini-3.5-flash` | часто 503 «high demand» — используется как резерв |
   | `gemini-3.8-flash` | не отвечает за 25 с (thinking) |
   | `gemini-2.5-flash` | 404 «no longer available to new users» |

   Резерв задаётся `VISION_MODEL_FALLBACK` (по умолчанию `gemini-3.5-flash`): при 404/5xx от
   основной модели функция сама повторяет запрос на резервной, ошибку житель не видит.

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
   npx supabase functions deploy analyze-photo
   npx supabase functions deploy submit-report
   ```

   `verify_jwt` оставляем включённым (по умолчанию): клиент шлёт anon-ключ в `Authorization`.

4. Smoke-тест (подставьте свой файл и ключи):

   ```bash
   curl -s -X POST "https://<ref>.supabase.co/functions/v1/analyze-photo" \
     -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>" \
     -F "file=@photo.jpg" -F "client_id=<uuid-v4>" -F "lang=ru" -F "mode=resident"
   # 200 → { "assessment": {...}, "cached": false, "contract_version": 1, "photo_path": "..." }
   # повторить тот же файл → "cached": true (ответ из кэша по SHA-256)
   ```

   `client_id` — **UUID v4** (`[guid]::NewGuid()` в PowerShell), иначе 400 `client_id должен быть UUID`.
   Это тот же идентификатор устройства, что генерирует клиент для лимита 12 запросов/час.

5. Ожидаемые ошибки: нет файла → 400 `INVALID_INPUT`; >2 МБ → 413 `FILE_TOO_LARGE`;
   GIF/HEIC → 415 `UNSUPPORTED_MEDIA`; 13-й запрос за час с одним `client_id` → 429 `RATE_LIMITED`;
   модель вернула мусор дважды → 502 `AI_INVALID`; модель молчит 25 с → 504 `AI_TIMEOUT`.

6. Проверка на телефоне: камера и галерея → результат за несколько секунд; фото кота → баннер
   «не дом и не участок»; тёмное фото → «низкая уверенность»; то же фото повторно → метка «Из кэша»;
   авиарежим → «Нет связи» без белого экрана; DevTools → в бандле нет `VISION_API_KEY`.

7. `submit-report` (срез 2) — деплой тем же способом, смоук:

   ```bash
   curl -s -X POST "https://<ref>.supabase.co/functions/v1/submit-report" \
     -H "apikey: <anon-key>" -H "Authorization: Bearer <anon-key>" \
     -H "Content-Type: application/json" \
     -d '{"contract_version":1,"client_id":"<uuid-v4>","device_hash":"<64-hex>","lat":42.42,"lng":76.18,
          "accuracy_m":8,"water_in_basement":true,"well_depth_m":2.4,"photo_path":"<тот же uuid-v4>/photo.jpg",
          "risk_level":"medium","confidence":0.62,"findings":[],"recommendations":[],
          "captured_at":null,"mode":"resident"}'
   # 200 → { "id": "...", "duplicate": false }; повторить с тем же client_id → "duplicate": true, второй строки нет
   ```

   Тело — `SubmitReportRequest` из `supabase/functions/_shared/report-schema.ts`. 400 `INVALID_INPUT` — тело
   не по схеме, в т.ч. `photo_path` не в папке своего `client_id`; 429 `RATE_LIMITED` — больше 10 отчётов в час
   с одного `device_hash` или 30 с одной сети (хэш IP). Координаты и хэши в лог не пишутся — только пути полей.
   Миграцию применить **до** первого вызова, любой из вариантов:

   - `npx supabase db push --linked` — если CLI залогинен под владельцем проекта;
   - `npx supabase db push --password <db-password>` (или `--db-url "postgresql://postgres.<ref>:<pwd>@...:5432/postgres"`) —
     если пароль БД под рукой: в `supabase/.temp/pooler-url` пароля **нет**, только хост и пользователь;
   - SQL Editor в Dashboard: вставить `supabase/migrations/20261024120000_report_submit.sql` целиком.

## 6. Откат / типовые проблемы

| Симптом | Причина | Что делать |
|---|---|---|
| Ссылка `/scan` отдаёт 404 | нет SPA-fallback | проверить `vercel.json` (rewrites) и Redeploy |
| После деплоя старая версия | SW кэширует | `/sw.js` должен отдаваться с `must-revalidate`; закрыть вкладку/переустановить PWA |
| Нет кнопки «Установить» | открыто по HTTP или уже установлено | только HTTPS; Chrome показывает баннер не всегда — меню «Установить приложение» |
| Билд падает на `tsc -b` | ошибка типов | локально `npm run build` и починить до пуша |
| Сканер: 503 `NOT_CONFIGURED` | не задан `VISION_API_KEY` (или пустой `VISION_MODEL`) | `npx supabase secrets set ...` и повторный вызов; секреты применяются без редеплоя |
| Сканер: 502 `SERVER` + «Модель отклонила запрос (401)» | ключ не от Gemini, ограничен по API или скопирован с пробелом/кавычками | проверить ключ напрямую: `curl -s -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent" -H "x-goog-api-key: <ключ>" -H "Content-Type: application/json" -d '{"contents":[{"parts":[{"text":"ping"}]}]}'` → должен вернуть `candidates`; иначе выпустить новый в <https://aistudio.google.com/apikey> и повторить `secrets set` |
| `secrets set` / `functions deploy` / `db push` (login role): 403 «does not have the necessary privileges» | CLI залогинен под другим аккаунтом (`projects list` не показывает проект) | `npx supabase login` под владельцем проекта, `link --project-ref <ref>`, либо задать секреты в Dashboard → Edge Functions → Secrets, а миграцию вставить в SQL Editor |
| Сканер: 502 + «Модель недоступна (404)» в логах | модель снята с обслуживания или закрыта для новых ключей (`gemini-2.5-flash`) | поставить `VISION_MODEL=gemini-3.5-flash-lite`; резерв `VISION_MODEL_FALLBACK` подхватится сам |
| Сканер: 502 + «Модель недоступна (503)» | «high demand» у провайдера | функция сама повторит на `VISION_MODEL_FALLBACK`; если и он 503 — подождать минуту |
| Сканер: 403 «Method doesn't allow unregistered callers» | ключ вообще не дошёл до запроса (пустая переменная, лишние кавычки в значении, забыт заголовок) | сверить длину: `$k.Length` (ключ Gemini: `AIza…` ≈ 39 символов или `AQ.…` ≈ 53); для проверки удобнее query-параметр: `...:generateContent?key=$k` |
| Сканер: 400 `client_id должен быть UUID` | смоук-запрос с произвольной строкой | передать UUID v4 (`[guid]::NewGuid()`) |
| Сканер: 401/403 на `analyze-photo` | в клиенте неверный `VITE_SUPABASE_ANON_KEY` или функция задеплоена с `verify_jwt` и без заголовка | сверить ключ в переменных Vercel и заголовки `apikey`/`Authorization` |