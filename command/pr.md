---
description: Автономный конвейер: валидация, Conventional Commit, push в remote и создание Pull Request через GitHub CLI
---

# PR Command | Команда /pr

## Назначение
Провести изменения от рабочего дерева до готового Pull Request: quality gates → безопасный staging → Conventional Commit → `git push` → `gh pr create`.

Реализация — `scripts/create-pr.mjs` (`npm run pr`). Этот файл описывает **фактическое** поведение скрипта.

## Вход
- `/pr --title "feat(scope): описание"`
- `/pr` — заголовок будет выведен из staged-путей
- Естественные фразы: *«давай запушим»*, *«создай PR»*, *«пуш и сделай PR»*

## Флаги
| Флаг | Действие |
|---|---|
| `--title "<text>"` | Заголовок коммита и PR (иначе выводится автоматически) |
| `--base <branch>` | Базовая ветка (по умолчанию определяется по `origin/HEAD`, иначе `main`) |
| `--draft` | Создать черновик PR |
| `--dry-run` | Показать все команды и проверки, ничего не менять |
| `--skip-gates` | Пропустить quality gates (в PR-теле отметится как непройденное) |
| `--allow-large` | Разрешить коммит крупных/подозрительных файлов |
| `--cleanup` | Если контент ветки уже влит в base — удалить локальную и удалённую ветку |

## Конвейер
1. **Preflight** — проверяются: git-репозиторий, наличие `gh`, `gh auth status`, remote `origin`.
   При отсутствии remote скрипт **останавливается** и печатает готовые команды:
   `git remote add origin …` либо `gh repo create <owner>/<repo> --source . --private --push`.
2. **Quality gates** — `npm run validate:all`, `npm run scan:secrets`, `npm run eval:routes`.
   Любой провал → СТОП, ничего не коммитится и не пушится.
3. **Staging с защитой** — `git add -A`, затем инспекция staged-путей:
   отказ при файлах >5 МБ и при совпадении с junk-паттернами (`node_modules/`, `*.exe`, `*.zip`, `*.log`, `.env*`).
4. **Ветка** — если текущая ветка `main`/`master`, создаётся `feat/<slug>`.
5. **Commit** — Conventional Commit; `--title` либо тип/скоуп выводятся из staged-путей.
6. **Duplicate-PR guard** — `git fetch origin --prune`, проверка контентного diff против `origin/<base>`
   (squash-merge не виден через `git log --cherry-pick`, поэтому проверяется именно diff) и `gh pr list --head <branch> --state open`.
   Найден открытый PR → новый НЕ создаётся.
7. **Push** — `git push -u origin <branch>`; exit code проверяется явно.
8. **PR** — `gh pr create` с телом: Summary → Commits → Changed files → Verification → Diff stat → Rollback.

## Инварианты реализации
- Никакой интерполяции пользовательского текста в shell: все вызовы `git`/`gh` идут через `execFile` с argv.
- Успех определяется по exit code, а не по отсутствию исключения.
- Ветки не удаляются и `push --delete` не выполняется без явного `--cleanup`.

## Пример вывода
```
--- 🚀 OpenCode PR pipeline ---
   remote: git@github.com:org/repo.git
   branch: feat/oauth2-google-auth

1. Quality gates (validate:all, scan:secrets, eval:routes)
   ✅ validate:all
   ✅ scan:secrets
   ✅ eval:routes

2. Staging working tree
   files: 12, total: 48 KB, per-file limit: 5 MB
...
🎉 PR created: https://github.com/org/repo/pull/42
```

## Если `gh` недоступен
Скрипт останавливается до коммита с инструкцией по установке/авторизации (`gh auth login`).
Push/PR без `gh` не выполняется — это осознанно, чтобы не создавать полу-состояние «запушено, но без PR».
