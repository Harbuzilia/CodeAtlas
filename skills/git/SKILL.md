---
name: git
description: git skill reference
---

# Git Workflow Skill

> Стандартные паттерны работы с Git и GitHub без лишнего шума.

## Quality Protocol (обязательно)

Цель: коммиты и PR должны быть осмысленными, проверяемыми и читаемыми человеком.

Базовые правила:
- Не коммить "для галочки". Если изменения временные/черновые — можно не коммитить.
- Один коммит = один законченный смысловой шаг.
- Не смешивай в одном коммите несвязанные изменения.
- Перед коммитом проверь diff и убедись, что изменения действительно нужны.
- Не используйте эмодзи и декоративные шаблоны в commit/PR тексте.

Когда не коммитить:
- Эксперимент, который не дал полезного результата.
- Временный debug/logging код.
- Частичный черновик без завершенного поведения.

Когда коммитить:
- Задача или ее логический шаг завершен.
- Есть понятный "зачем" и "что изменилось".
- Пройдены релевантные проверки.

---

## Conventional Commits (СТРОГО ОБЯЗАТЕЛЬНО)

НИКОГДА не используй другие форматы сообщений для коммитов. Каждое сообщение должно строго следовать этому стандарту.

### Формат

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Типы

| Type | Описание |
|------|----------|
| `feat` | Новая функциональность |
| `fix` | Исправление бага |
| `docs` | Документация |
| `style` | Форматирование (не влияет на код) |
| `refactor` | Рефакторинг (не fix и не feat) |
| `perf` | Улучшение производительности |
| `test` | Добавление тестов |
| `chore` | Обслуживание (deps, configs) |

### Примеры

```bash
feat(auth): add JWT refresh token support
fix(api): handle null response from external service
docs(readme): update installation instructions
refactor(user): extract validation to separate module
```

---

## Branching Strategy

### Git Flow (для releases)

```
main        ─────●─────────●─────────●─────
            ↑         ↑         ↑
release     ──●───────●         │
            ↑↑        ↑         │
develop  ───●─●───────●─────────●─────────
            ↑         ↑         ↑
feature     ──●───────          │
hotfix                          ──●───────
```

### Trunk-Based (для CI/CD)

```
main     ───●───●───●───●───●───●───
            ↑   ↑   ↑   ↑   ↑   ↑
feature     └─┘ └─┘ └─┘ └─┘ └─┘ └─┘
           (short-lived, <1 day)
```

---

## Частые команды

### Начало работы

```bash
# Клонировать
git clone <url>
cd <repo>

# Создать ветку
git checkout -b feat/user-auth

# Посмотреть статус
git status
git diff
```

### Коммит

```bash
# Добавить файлы
# Предпочитай явный add вместо git add .
git add src/auth.ts tests/auth.test.ts

# Коммит
git commit -m "feat(auth): implement JWT authentication"
```

Рекомендации:
- `git add .` допустим только когда ты уверен, что нет лишних файлов.
- `--amend` используй только если это действительно корректировка последнего локального коммита и не ломает историю команды.

### Sync с remote

```bash
# Получить изменения
git fetch origin
git pull origin main --rebase

# Отправить
git push origin feat/user-auth
```

### Merge / Rebase

```bash
# Merge (сохраняет историю)
git checkout main
git merge feat/user-auth

# Rebase (чистая история)
git checkout feat/user-auth
git rebase main
git checkout main
git merge feat/user-auth --ff-only
```

---

## GitHub PR Standard

### PR должен отвечать на 4 вопроса
1. Зачем это изменение?
2. Что изменилось по сути?
3. Как это проверено?
4. Какие риски/ограничения остались?

### Рекомендуемый формат описания PR
```markdown
## Summary
- ...

## Validation
- [ ] tests
- [ ] lint/typecheck
- [ ] smoke/manual checks

## Risks
- ...
```

### Минимальные правила качества PR
- Не открывай PR с шумом и несвязанными файлами.
- Если меняется поведение, приложи короткий план валидации.
- Если есть code/docs drift, явно укажи follow-up.

### GitHub CLI (gh)
```bash
# Создать PR
gh pr create --title "feat(scope): short title" --body "..."

# Посмотреть PR
gh pr view --web

# Получить комментарии review
gh pr view --comments
```

## Решение проблем

### Откатить незакоммиченные изменения

```bash
# Один файл
git checkout -- file.ts

# Все файлы
git checkout -- .

# Удалить untracked файлы
git clean -fd
```

### Откатить коммит

```bash
# Мягкий откат (сохраняет изменения)
git reset --soft HEAD~1

# Жёсткий откат (удаляет изменения)
git reset --hard HEAD~1

# Откат конкретного коммита (создаёт новый)
git revert <commit-hash>
```

### Конфликты при merge

```bash
# Посмотреть конфликтные файлы
git status

# Разрешить конфликты в файлах
# <<<<<<< HEAD
# ваши изменения
# =======
# их изменения
# >>>>>>> branch-name

# После разрешения
git add .
git commit
```

---

## .gitignore Best Practices

```gitignore
# Dependencies
node_modules/
vendor/
.venv/

# Build
dist/
build/
*.pyc
__pycache__/

# IDE
.idea/
.vscode/
*.swp

# Environment
.env
.env.local
*.local

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Test coverage
coverage/
.nyc_output/
```

---

## Pre-commit Checklist

- [ ] `git status` — проверь что коммитишь
- [ ] `git diff --staged` — просмотри изменения
- [ ] Тесты проходят локально
- [ ] Линтер не ругается
- [ ] Commit message по conventional commits
- [ ] Не коммитишь секреты (.env, keys)
