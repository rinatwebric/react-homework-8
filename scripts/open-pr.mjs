/**
 * Открывает pull request из текущей ветки в базовую (по умолчанию `main`) через GitHub REST API.
 *
 * Нужен потому, что `gh` в этом окружении нет: один POST `/repos/{owner}/{repo}/pulls` — и PR готов.
 * Если PR для ветки уже открыт, скрипт печатает ссылку и выходит с кодом 0 (повторный запуск безопасен).
 *
 * Токен нигде не печатается. Источники по порядку: `GITHUB_TOKEN`, `GH_TOKEN`,
 * затем файлы `../.secrets/github-pat.txt`, `.secrets/github-pat.txt`, `github-pat.txt`.
 * Токену достаточно scope `repo` (classic) либо fine-grained с правом
 * Contents: read & write + Pull requests: read & write на этот репозиторий.
 *
 * Запуск:
 *   node scripts/open-pr.mjs --title "feat(report): форма заявки v2.0" \
 *     --body-file docs/pr2-form-description.md --base main
 *   node scripts/open-pr.mjs ... --dry-run   # только показать, что будет отправлено
 */

import { execFileSync } from 'node:child_process'
import { readFile, access } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const API = 'https://api.github.com'

const args = process.argv.slice(2)
const hasFlag = (flag) => args.includes(flag)
const argValue = (flag) => {
  const i = args.indexOf(flag)
  return i === -1 ? null : (args[i + 1] ?? null)
}

const dryRun = hasFlag('--dry-run')
const draft = hasFlag('--draft')
const base = argValue('--base') ?? 'main'
const title = argValue('--title')

async function exists(path) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

function clean(raw) {
  return raw
    .replace(/^\uFEFF/, '')
    .trim()
    .replace(/^["']|["']$/g, '')
}

async function readToken() {
  const fromEnv = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN
  if (fromEnv?.trim()) return clean(fromEnv)

  const candidates = [
    join(ROOT, '..', '.secrets', 'github-pat.txt'),
    join(ROOT, '.secrets', 'github-pat.txt'),
    join(ROOT, 'github-pat.txt'),
  ]
  for (const path of candidates) {
    if (!(await exists(path))) continue
    return clean(await readFile(path, 'utf8'))
  }
  return null
}

const git = (...gitArgs) =>
  execFileSync('git', gitArgs, { cwd: ROOT, encoding: 'utf8' }).trim()

/** `https://github.com/owner/repo.git` или `git@github.com:owner/repo.git` → `{ owner, repo }`. */
function readRepo() {
  const explicit = argValue('--repo')
  if (explicit) {
    const [owner, repo] = explicit.split('/')
    return { owner, repo }
  }
  const url = git('remote', 'get-url', 'origin')
  const match = /github\.com[:/]+([^/]+)\/([^/\s]+?)(?:\.git)?$/.exec(url)
  if (!match) throw new Error(`Не разобрал remote origin: ${url}`)
  return { owner: match[1], repo: match[2] }
}

async function api(token, path, init = {}) {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json; charset=utf-8',
      'User-Agent': 'suutech-pr-script',
      ...init.headers,
    },
  })
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { ok: response.ok, status: response.status, body }
}

async function main() {
  const head = argValue('--head') ?? git('rev-parse', '--abbrev-ref', 'HEAD')
  if (!title) throw new Error('Нужен --title «…».')
  if (head === base) throw new Error(`Текущая ветка совпадает с базовой (${base}).`)

  const bodyFile = argValue('--body-file')
  const body = bodyFile ? await readFile(resolve(ROOT, bodyFile), 'utf8') : ''
  const { owner, repo } = readRepo()

  // Локальные коммиты, которых нет в origin, GitHub не увидит — предупреждаем заранее.
  const ahead = git('rev-list', '--count', `origin/${head}..${head}`)

  console.log(`Репозиторий: ${owner}/${repo}`)
  console.log(`Ветка: ${head} → ${base}${draft ? ' (draft)' : ''}`)
  console.log(`Заголовок: ${title}`)
  console.log(`Описание: ${body.length} символов${bodyFile ? ` из ${bodyFile}` : ''}`)
  if (ahead !== '0') console.log(`Внимание: не запушено коммитов — ${ahead} (сначала git push)`)

  const token = await readToken()
  if (!token) {
    if (!dryRun) {
      console.error(
        'Токен не найден. Положите GitHub PAT в один из файлов:\n' +
          '  ../.secrets/github-pat.txt   (рекомендуется: вне репозитория)\n' +
          '  .secrets/github-pat.txt\n' +
          'или задайте $env:GITHUB_TOKEN.',
      )
      process.exitCode = 1
      return
    }
  }

  if (dryRun) {
    console.log('\n-- dry-run: POST /repos/%s/%s/pulls', owner, repo)
    console.log(JSON.stringify({ title, head, base, draft, body }, null, 2))
    return
  }

  // Уже открытый PR — не ошибка: печатаем ссылку и выходим.
  const existing = await api(
    token,
    `/repos/${owner}/${repo}/pulls?state=open&head=${owner}:${head}`,
  )
  if (existing.ok && Array.isArray(existing.body) && existing.body.length > 0) {
    const pr = existing.body[0]
    console.log(`\nPR уже открыт: #${pr.number} ${pr.html_url}`)
    return
  }

  const created = await api(token, `/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({ title, head, base, draft, body }),
  })

  if (!created.ok) {
    const detail = created.body?.message ?? JSON.stringify(created.body)
    const errors = (created.body?.errors ?? [])
      .map((error) => `${error.resource ?? ''} ${error.field ?? ''} ${error.code ?? ''}`.trim())
      .join('; ')
    throw new Error(`GitHub ${created.status}: ${detail}${errors ? ` — ${errors}` : ''}`)
  }

  console.log(`\nPR создан: #${created.body.number} ${created.body.html_url}`)
}

main().catch((error) => {
  console.error(`\nОшибка: ${error.message}`)
  process.exitCode = 1
})