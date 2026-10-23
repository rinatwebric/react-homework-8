/**
 * Проверка миграций и RLS без Docker: поднимаем Postgres в WASM (PGlite),
 * подставляем заглушки Supabase (auth.users, auth.uid(), storage.*) и прогоняем
 * supabase/migrations/*.sql, затем проверяем права от anon / модератора.
 *
 * Запуск: npm run verify:sql
 * Это не замена `npx supabase db reset` (нет всех расширений и реальных политик
 * Storage), но ловит синтаксис, гранты и логику RLS в машине без Docker.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const MIGRATIONS_DIR = 'supabase/migrations'

const db = new PGlite()

const stubs = `
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create schema storage;
create table storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text, name text
);
alter table storage.objects enable row level security;
`

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ' — ' + detail : ''}`)
}

const expectError = async (name, sql) => {
  try {
    await db.exec(sql)
    check(name, false, 'запрос неожиданно прошёл')
  } catch (error) {
    check(name, true, String(error.message).slice(0, 90))
  }
}

await db.exec(stubs)
const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort()
for (const file of migrations) {
  await db.exec(readFileSync(`${MIGRATIONS_DIR}/${file}`, 'utf8'))
  console.log(`— применена миграция ${file} —`)
}

// Срез 2: колонка для лимита частоты и правило «фото принадлежит отчёту».
const ipHashColumn = await db.query(`
  select column_name from information_schema.columns
  where table_schema = 'public' and table_name = 'reports' and column_name = 'ip_hash'`)
check('reports.ip_hash существует (лимит по IP)', ipHashColumn.rows.length === 1)

await expectError(
  'фото из чужой папки отклоняется',
  `insert into public.reports (client_id, photo_path)
   values ('77777777-7777-4777-8777-777777777777',
           'reports/88888888-8888-4888-8888-888888888888/x.jpg')`,
)
await db.exec(`insert into public.reports (client_id, photo_path) values
  ('99999999-9999-4999-8999-999999999999',
   'reports/99999999-9999-4999-8999-999999999999/x.jpg')`)
const ownPhoto = await db.query(`
  select count(*)::int as n from public.reports
  where client_id = '99999999-9999-4999-8999-999999999999'`)
check('фото в своей папке client_id принимается', ownPhoto.rows[0].n === 1)
await db.exec(`
  delete from public.reports where client_id = '99999999-9999-4999-8999-999999999999'`)

const TABLES_WITH_RLS = [
  'reports',
  'alerts',
  'push_subscriptions',
  'moderators',
  'photo_assessments',
  'zone_risk',
]
const relrowsecurity = await db.query(`
  select relname, relrowsecurity from pg_class
  where relname in (${TABLES_WITH_RLS.map((table) => `'${table}'`).join(',')})
  order by relname`)
check(
  `RLS включён на ${TABLES_WITH_RLS.length} таблицах`,
  relrowsecurity.rows.every((r) => r.relrowsecurity === true) &&
    relrowsecurity.rows.length === TABLES_WITH_RLS.length,
  relrowsecurity.rows.map((r) => `${r.relname}=${r.relrowsecurity}`).join(' '),
)

const modId = '11111111-1111-1111-1111-111111111111'
await db.exec(`
  insert into auth.users (id, email) values ('${modId}', 'mod@suutech.kg');
  insert into public.moderators (user_id) values ('${modId}');
  insert into public.reports (client_id, lat, lng, risk_level, water_in_basement)
  values ('22222222-2222-2222-2222-222222222222', 42.34793, 76.16690, 'high', true);
  insert into public.zone_risk (zone_id, level, reasons)
  values ('92254566B71058624193805', 'elevated', array['demo']);
  insert into public.alerts (level, message, zone_id) values ('high', 'Тест', 'kg-ton');
  insert into public.photo_assessments (sha256, client_id, status, assessment, model)
  values (
    repeat('a', 64), '44444444-4444-4444-4444-444444444444', 'ok',
    '{"risk_level":"low","confidence":0.8}'::jsonb, 'gemini-test'
  );
`)

await expectError(
  'ok-запись photo_assessments без assessment запрещена',
  `insert into public.photo_assessments (sha256, client_id, status)
   values (repeat('b', 64), '55555555-5555-5555-5555-555555555555', 'ok')`,
)
await expectError(
  'один и тот же хэш фото не оценивается дважды',
  `insert into public.photo_assessments (sha256, client_id, status)
   values (repeat('a', 64), '66666666-6666-6666-6666-666666666666', 'ai_timeout')`,
)

const generated = await db.query('select lat, lat_public, lng_public from public.reports')
check(
  'lat_public/lng_public округлены до 3 знаков',
  generated.rows[0].lat_public === 42.348 && generated.rows[0].lng_public === 76.167,
  JSON.stringify(generated.rows[0]),
)

const bucket = await db.query("select * from storage.buckets where id = 'report-photos'")
check(
  'бакет report-photos: 2 МБ, только изображения',
  bucket.rows.length === 1 &&
    Number(bucket.rows[0].file_size_limit) === 2097152 &&
    bucket.rows[0].allowed_mime_types.join(',') === 'image/jpeg,image/png,image/webp',
  JSON.stringify(bucket.rows[0]?.allowed_mime_types),
)

await db.exec('set role anon')
const pub = await db.query('select * from public.reports_public')
check('anon читает reports_public', pub.rows.length === 1, `строк: ${pub.rows.length}`)
const viewCols = await db.query(
  "select * from public.reports_public where lat_public is not null",
)
check('в view только округлённые координаты', viewCols.rows[0].lat_public === 42.348)
await expectError('anon НЕ видит точный lat в reports', 'select lat from public.reports')
await expectError('anon НЕ видит device_hash', 'select device_hash from public.reports')
await expectError('anon НЕ видит ip_hash', 'select ip_hash from public.reports')
const alerts = await db.query('select * from public.alerts')
// Срез 2, PR-2: уровень риска зоны карта читает публично, писать может только service role.
const zoneRisk = await db.query('select level, reasons from public.zone_risk')
check('anon читает zone_risk', zoneRisk.rows.length === 1, `строк: ${zoneRisk.rows.length}`)
await expectError(
  'anon НЕ может писать в zone_risk',
  "insert into public.zone_risk (zone_id, level) values ('kg-test', 'high')",
)
await expectError(
  'anon НЕ может менять уровень зоны',
  "update public.zone_risk set level = 'critical'",
)
check('anon читает alerts', alerts.rows.length === 1)
await expectError(
  'anon НЕ может вставлять reports',
  "insert into public.reports (client_id) values ('33333333-3333-3333-3333-333333333333')",
)
await expectError('anon НЕ может менять status', "update public.reports set status = 'resolved'")
await expectError('anon НЕ видит push_subscriptions', 'select * from public.push_subscriptions')
await expectError(
  'anon НЕ видит кэш AI-оценок',
  'select * from public.photo_assessments',
)
await db.exec('reset role')

await db.exec(`select set_config('request.jwt.claim.sub', '${modId}', false)`)
await db.exec('set role authenticated')
const modRead = await db.query('select count(*)::int as n from public.reports_public')
check('authenticated читает публичное представление', modRead.rows[0].n === 1)
await db.exec("update public.reports set status = 'reviewed'")
const updated = await db.query(
  "select status from public.reports_public where status = 'reviewed'",
)
check('модератор меняет статус отчёта', updated.rows.length === 1)
await db.exec('reset role')

await db.exec(`select set_config('request.jwt.claim.sub', '', false)`)
await db.exec('set role authenticated')
// RLS не бросает ошибку на UPDATE — просто не находит строк (0 обновлённых)
const denied = await db.query("update public.reports set status = 'resolved' returning id")
check('не-модератор НЕ может менять статус', denied.rows.length === 0, `обновлено строк: ${denied.rows.length}`)
const stillReviewed = await db.query("select count(*)::int as n from public.reports_public where status = 'reviewed'")
check('статус отчёта не изменился', stillReviewed.rows[0].n === 1)
await db.exec('reset role')

const failed = results.filter((r) => !r.ok)
console.log(`\nИтого: ${results.length - failed.length}/${results.length} проверок пройдено`)
await db.close()
process.exit(failed.length === 0 ? 0 : 1)