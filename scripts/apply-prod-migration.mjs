/**
 * Применение миграции к прод-проекту Supabase через Management API.
 *
 * Зачем отдельный скрипт: `npx supabase db push` с personal access token (CLI 2.122) падает
 * с «Cannot find project ref», а пароля БД под рукой нет. Management API `/database/query`
 * выполняет SQL от владельца проекта — того же пути придерживается MCP `apply_migration`.
 * Ручной PowerShell-эквивалент: docs/deploy.md, раздел «Деплой функции».
 *
 * Две вещи, которые скрипт делает обязательно:
 *   1) дописывает строку в `supabase_migrations.schema_migrations` — без неё следующий
 *      `db push` попробует применить ту же миграцию повторно;
 *   2) после применения проверяет фактическое состояние схемы (`--check` делает только это).
 *
 * Токен нигде не печатается. Источники по порядку: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PAT`,
 * затем файлы `../.secrets/supabase-pat.txt`, `.secrets/supabase-pat.txt`, `supabase-pat.txt`.
 *
 * Запуск:
 *   node scripts/apply-prod-migration.mjs --check      # только проверка прода, ничего не меняет
 *   node scripts/apply-prod-migration.mjs --dry-run    # напечатать SQL и выйти
 *   node scripts/apply-prod-migration.mjs              # применить миграцию по умолчанию
 *   node scripts/apply-prod-migration.mjs --file supabase/migrations/<file>.sql
 */

import { readFile, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_MIGRATION = 'supabase/migrations/20261024190000_reports_v2_triage.sql'
const DEFAULT_PROJECT_REF = 'ljwyrvyzvuxauylmtosp'
const API = 'https://api.supabase.com/v1'

/** Колонки, без которых прод-функция `submit-report` упадёт на insert. */
const REQUIRED_REPORT_COLUMNS = [
  'category_user',
  'comment',
  'location_adjusted_m',
  'immediate_danger',
  'weather_snapshot',
  'created_by',
]
/** Что обязано появиться в публичном представлении (§14): карте нужны эти поля. */
const REQUIRED_VIEW_COLUMNS = ['category_user', 'comment', 'immediate_danger', 'weather_snapshot']
const REQUIRED_TABLES = ['ai_triage', 'report_status_history']

const args = process.argv.slice(2)
const hasFlag = (flag) => args.includes(flag)
const argValue = (flag) => {
  const i = args.indexOf(flag)
  return i === -1 ? null : (args[i + 1] ?? null)
}

const checkOnly = hasFlag('--check')
const dryRun = hasFlag('--dry-run')
const migrationPath = resolve(ROOT, argValue('--file') ?? DEFAULT_MIGRATION)
const projectRef = process.env.SUPABASE_PROJECT_REF ?? argValue('--project') ?? DEFAULT_PROJECT_REF

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

/**
 * Токен ищем в переменных окружения, затем в файлах вне репозитория.
 * Обрезаем BOM, кавычки и переводы строк — самая частая причина «Invalid token».
 */
async function readToken() {
  const fromEnv = process.env.SUPABASE_ACCESS_TOKEN ?? process.env.SUPABASE_PAT
  if (fromEnv?.trim()) return clean(fromEnv)

  const candidates = [
    join(ROOT, '..', '.secrets', 'supabase-pat.txt'),
    join(ROOT, '.secrets', 'supabase-pat.txt'),
    join(ROOT, 'supabase-pat.txt'),
  ]
  for (const path of candidates) {
    if (!(await exists(path))) continue
    return clean(await readFile(path, 'utf8'))
  }
  return null
}

function clean(raw) {
  return raw
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
}

/** `20261024190000_reports_v2_triage.sql` → version `20261024190000`, name `reports_v2_triage`. */
function parseMigration(file) {
  const base = file
    .split(/[\\/]/)
    .pop()
    .replace(/\.sql$/i, '')
  const match = /^(\d+)_(.+)$/.exec(base)
  if (!match) throw new Error(`Имя файла не в формате <version>_<name>.sql: ${base}`)
  return { version: match[1], name: match[2] }
}

async function query(token, sql) {
  const response = await fetch(`${API}/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ query: sql }),
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!response.ok) {
    const detail = typeof body === 'string' ? body : (body?.message ?? JSON.stringify(body))
    throw new Error(`Management API ${response.status}: ${detail}`)
  }
  // Ответ — массив строк (иногда в обёртке `result`); приводим к строкам.
  if (Array.isArray(body)) return body
  if (Array.isArray(body?.result)) return body.result
  return body ? [body] : []
}

const verifySql = (version) => `
select json_build_object(
  'version_applied', exists (
    select 1 from supabase_migrations.schema_migrations where version = '${version}'
  ),
  'report_columns', (
    select json_agg(column_name::text order by column_name::text)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'reports'
  ),
  'view_columns', (
    select json_agg(column_name::text order by column_name::text)
    from information_schema.columns
    where table_schema = 'public' and table_name = 'reports_public'
  ),
  'tables', (
    select json_agg(table_name::text order by table_name::text)
    from information_schema.tables
    where table_schema = 'public' and table_name in ('ai_triage', 'report_status_history')
  ),
  'status_check', (
    select pg_get_constraintdef(oid) from pg_constraint where conname = 'reports_status_check'
  ),
  'category_check', (
    select pg_get_constraintdef(oid) from pg_constraint where conname = 'reports_category_user_check'
  ),
  'location_adjusted_check', (
    select pg_get_constraintdef(oid) from pg_constraint
    where conname = 'reports_location_adjusted_check'
  )
);`

/** json_build_object приходит под произвольным именем колонки — берём первое значение-объект. */
function unwrapRow(rows) {
  const row = rows.at(-1)
  if (!row || typeof row !== 'object') return null
  return Object.values(row).find((value) => value && typeof value === 'object') ?? null
}

function report(state, version) {
  const ok = []
  const bad = []

  if (state.version_applied) ok.push(`schema_migrations: версия ${version} записана`)
  else bad.push(`schema_migrations: версия ${version} НЕ записана`)

  for (const column of REQUIRED_REPORT_COLUMNS) {
    if ((state.report_columns ?? []).includes(column)) ok.push(`reports.${column} есть`)
    else bad.push(`reports.${column} ОТСУТСТВУЕТ`)
  }
  for (const column of REQUIRED_VIEW_COLUMNS) {
    if ((state.view_columns ?? []).includes(column)) ok.push(`reports_public.${column} есть`)
    else bad.push(`reports_public.${column} ОТСУТСТВУЕТ`)
  }
  for (const table of REQUIRED_TABLES) {
    if ((state.tables ?? []).includes(table)) ok.push(`${table} есть`)
    else bad.push(`${table} ОТСУТСТВУЕТ`)
  }

  const statusCheck = state.status_check ?? ''
  const statusesOk = ['triaged', 'assigned', 'rejected'].every((s) => statusCheck.includes(s))
  if (statusesOk) ok.push('reports_status_check содержит статусы §12')
  else bad.push(`reports_status_check НЕ обновлён: ${statusCheck || 'нет'}`)

  const adjustedCheck = state.location_adjusted_check ?? ''
  if (adjustedCheck.includes('300')) ok.push('reports_location_adjusted_check держит предел 300 м')
  else bad.push('reports_location_adjusted_check ОТСУТСТВУЕТ или без предела 300')

  console.log('\nПроверка схемы прода:')
  for (const line of ok) console.log(`  ok   ${line}`)
  for (const line of bad) console.log(`  FAIL ${line}`)
  return bad.length === 0
}

async function main() {
  const token = await readToken()
  if (!token && !dryRun) {
    console.error(
      'Токен не найден. Положите personal access token (sbp_…) в один из файлов:\n' +
        '  ../.secrets/supabase-pat.txt   (рекомендуется: вне репозитория)\n' +
        '  .secrets/supabase-pat.txt\n' +
        'или задайте $env:SUPABASE_ACCESS_TOKEN.',
    )
    process.exitCode = 1
    return
  }
  if (token && !token.startsWith('sbp_')) {
    console.error('Токен не похож на Supabase PAT (ожидается префикс `sbp_`).')
    process.exitCode = 1
    return
  }

  const sql = await readFile(migrationPath, 'utf8')
  const { version, name } = parseMigration(migrationPath)
  console.log(`Проект: ${projectRef}`)
  console.log(`Миграция: ${version}_${name} (${sql.length} символов)`)

  if (checkOnly) {
    const state = unwrapRow(await query(token, verifySql(version)))
    if (!state) throw new Error('Management API вернул пустой ответ на проверку схемы.')
    process.exitCode = report(state, version) ? 0 : 1
    return
  }

  const record = `\ninsert into supabase_migrations.schema_migrations (version, name) values ('${version}', '${name}') on conflict (version) do nothing;`

  if (dryRun) {
    console.log(`\n-- dry-run: тело запроса к /projects/${projectRef}/database/query\n`)
    console.log(sql.trimEnd() + record)
    return
  }

  console.log('Применяю…')
  await query(token, sql + record)
  console.log('SQL выполнен, строка версии записана.')

  const state = unwrapRow(await query(token, verifySql(version)))
  if (!state) throw new Error('Management API вернул пустой ответ на проверку схемы.')
  const ok = report(state, version)
  console.log(ok ? '\nГотово: прод соответствует миграции.' : '\nЕсть расхождения — см. FAIL выше.')
  process.exitCode = ok ? 0 : 1
}

main().catch((error) => {
  console.error(`\nОшибка: ${error.message}`)
  process.exitCode = 1
})