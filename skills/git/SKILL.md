---
name: git
description: "Git workflow: один коммит = один смысловой шаг, строгие Conventional Commits без эмодзи, git add явными путями, проверка diff перед коммитом, PR с summary/validation/risks"
---

# Git Workflow Skill

> Осмысленные коммиты и PR, проверяемые человеком.

## Quality Protocol (обязательно)

- Один коммит = один законченный смысловой шаг; не смешивай несвязанные изменения.
- Не коммить: эксперименты без результата, временный debug/logging, незавершённые черновики.
- Перед коммитом: `git status` + `git diff --staged` — проверь, что коммитишь.
- Без эмодзи и декоративных шаблонов в commit/PR тексте.

---

## Conventional Commits (СТРОГО)

```
<type>(<scope>): <description>
```

| Type | Когда |
|------|-------|
| `feat` | Новая функциональность |
| `fix` | Исправление бага |
| `docs` | Документация |
| `style` | Форматирование (не код) |
| `refactor` | Не fix и не feat |
| `perf` | Производительность |
| `test` | Тесты |
| `chore` | deps, configs |

---

## Правила операций

- `git add` — явные пути, не `git add .` (только если уверен в отсутствии лишнего).
- `--amend` — только для локального последнего коммита, не опубликованного.
- Sync: `git pull --rebase`; force-push — только `--force-with-lease`.
- Откат незакоммиченного: `git restore <file>` / `git restore .`; untracked: `git clean -fd`.
- Откат коммита: `git revert <hash>` (публичный) | `git reset --soft HEAD~1` (локальный).
- Секреты (.env, keys) — НИКОГДА в коммитах.

---

## GitHub PR Standard

### Title

Conventional commit: `feat(crm): add billing gates over run center`. Одна строка, без номера задачи в конце (GitHub сам линкует).

### Body — СТРОГО структурированный (эталон)

Тело НИКОГДА не простыня текста. Секции по областям изменений, пути файлов в backticks, валидация — точные команды с результатами:

```markdown
## <Область 1: например "Админка: кастомный промпт">
- `api/services/agent-config.service.ts` — get/updateAgentConfig via prisma.workspaceSettings
- `api/routes/settings.routes.ts` — GET/PATCH /settings/agent-config (Zod, withAuth/withScope)

## <Область 2>
- `path/file.ts` — что сделано, одной строкой

## Validation
- `pnpm --filter crm typecheck` — 0 errors
- `pnpm --filter crm exec vitest run src/features/x` — 29/29
- `pnpm --filter crm exec vite build` — ok

## Risks
- Нет breaking changes, expand-only. Rollback — revert коммита.
```

Правила:
- Каждый затронутый файл — отдельный bullet с `code`-путём и одной строкой «что».
- Группировка по функциональным областям, НЕ по алфавиту.
- Validation: реальный вывод команд, не «всё зелёное».
- Нет файла в списке → файл не попадает в PR (проверь `git diff --stat` перед созданием).

### Создание — ЗАПРЕТ на инлайн body

**НИКОГДА `gh pr create --body "..."` инлайн.** В PowerShell backtick `` ` `` — escape-символ: `` `a `` превращается в bell char, GitHub рендерит его как `` («\pps/crm/...» вместо `` `apps/crm/...` ``). Только через файл:

```powershell
# 1. Пишем body в temp-файл (write tool, UTF-8)
# 2. Создаём PR из файла
gh pr create --title "feat(scope): title" --body-file .git/pr-body.md
# 3. Удаляем temp-файл
Remove-Item .git/pr-body.md
```

### Checks gate

- НЕ мёрджить при failing checks без явного разрешения пользователя.
- `gh pr checks` перед мёрджем; если есть ❌ — назвать упавший check и причину, ждать решения.

```bash
gh pr view --comments   # review feedback
gh pr checks            # статус CI
```

## Pre-commit Checklist

- [ ] `git status` + `git diff --staged` просмотрены
- [ ] Тесты и линтер зелёные локально
- [ ] Commit message по conventional commits
- [ ] Нет секретов (.env, keys)
