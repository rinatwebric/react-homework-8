@AGENTS.md

## Claude Code
- Скиллы: `.claude/skills/` (та же копия, что в `.agents/skills/`). Если правишь проектный скилл — правь обе копии.
- Субагенты: `suutech-reviewer` (ревью diff по ТЗ и безопасности), `suutech-debugger` (поиск причины бага).
- Команды: `/slice <задача>`, `/review`, `/bug <описание>`, `/freeze-check`.
- MCP (`.mcp.json`): `context7` — актуальная документация библиотек, `playwright` — проверка в браузере,
  `supabase` — только чтение. Миграции применяй через Supabase CLI, а не через MCP.
