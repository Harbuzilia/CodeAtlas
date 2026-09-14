---
description: Автономный конвейер: валидация, Conventional Commit, push в remote и создание Pull Request через GitHub CLI
---

# PR Command | Команда /pr

## Назначение
Автоматизировать весь путь от локальных изменений до готового Pull Request: проверка Quality Gates, создание feature-ветки, Conventional Commit, `git push` и создание PR через `gh pr create` с исчерпывающим описанием.

## Вход
- `/pr <заголовок/описание>`
- `/pr` без аргументов или естественные команды (*"давай запушим"*, *"создай PR"*, *"пуш и сделай PR"*)

## Автоматический конвейер (Pipeline)
1. **Quality Gate Validation**: Запустить `npm run validate:all` и `npm run eval:routes`. Если есть ошибки — СТОП и отчет.
2. **Анализ ветки**:
   - Если текущая ветка `main` или `master`, создать feature-ветку: `git checkout -b <feat|fix>/<краткое-название>`.
2.5. **Duplicate-PR Guard (ОБЯЗАТЕЛЬНО)**:
   - `git fetch origin --prune`
   - `git diff --name-only origin/main..HEAD` — если ПУСТО, контент уже в `main` (типично после squash-merge: коммиты остаются «ahead» по истории, но diff нулевой). В этом случае PR НЕ создавать: `git checkout main && git branch -D <branch> && git push origin --delete <branch>`, отчитаться и завершить.
   - `gh pr list --head <branch> --state all --json number,state` — если PR для этой ветки уже существует (open/merged), новый НЕ создавать.
   - Авторитетная проверка — именно контентный diff выше: `git log --cherry-pick` squash-merge НЕ детектит (patch-id отдельных коммитов не совпадают со squash-коммитом), он ловит только cherry-pick/rebase-дубликаты.
3. **Conventional Commit & Push**:
   - `git add .`
   - Сгенерировать сообщение коммита по стандарту Conventional Commits.
   - `git commit -m "..."`
   - `git push -u origin <branch>`
4. **Создание Pull Request**:
   - Сформировать структурированное описание:
     - **Summary & Motivation**
     - **Key Changes Table**
     - **Quality & Verification Checklist**
     - **Rollback Plan**
   - Выполнить `gh pr create --title "..." --body "..."` (или сгенерировать ссылку/команду, если `gh` не авторизован).

## Пример вывода
```
## 🚀 Pull Request создан!

- **Ветка**: `feat/oauth2-google-auth`
- **Заголовок**: `feat(auth): add Google OAuth2 provider and user session management`
- **PR URL**: https://github.com/org/repo/pull/42

### Сводка изменений:
- Добавлен контроллер авторизации и JWT-генерация
- Добавлены unit и e2e тесты (100% pass)
- Quality Gates пройдены успешно
```
