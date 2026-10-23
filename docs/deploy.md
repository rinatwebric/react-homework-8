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

## 2. Backend (Supabase) — миграция

Docker в рабочей среде нет, поэтому локальный стек не поднимаем (проверка SQL —
`npm run verify:sql`, Postgres в WASM). Миграция применяется к облачному проекту:

```bash
npx supabase login                       # интерактивно, один раз
npx supabase link --project-ref <ref>    # ref из URL проекта в дашборде
npx supabase db push                     # применит supabase/migrations/*.sql
```

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

## 5. Откат / типовые проблемы

| Симптом | Причина | Что делать |
|---|---|---|
| Ссылка `/scan` отдаёт 404 | нет SPA-fallback | проверить `vercel.json` (rewrites) и Redeploy |
| После деплоя старая версия | SW кэширует | `/sw.js` должен отдаваться с `must-revalidate`; закрыть вкладку/переустановить PWA |
| Нет кнопки «Установить» | открыто по HTTP или уже установлено | только HTTPS; Chrome показывает баннер не всегда — меню «Установить приложение» |
| Билд падает на `tsc -b` | ошибка типов | локально `npm run build` и починить до пуша |