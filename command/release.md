---
description: Автоматическая подготовка релиза SemVer, генерация changelog из Conventional Commits и создание Git-тега
---

# Release Command | Команда /release

## Назначение
Автоматизировать выпуск новых версий проекта: анализ Conventional Commits с прошлого тега, бамп версии в `package.json`, формирование новой секции в `CHANGELOG.md` и создание аннотированного Git-тега.

## Вход
- `/release <patch|minor|major>` (например, `/release minor`)
- `/release` без аргументов — по умолчанию bump `patch`

## Автоматический конвейер (Pipeline)
1. **Проверка чистоты дерева**: Убедиться, что `git status` чист.
2. **Quality Gates**: Запуск `npm run validate:all` перед релизом.
3. **Анализ коммитов**: Сбор коммитов с последнего тега и группировка:
   - `feat` -> New Features
   - `fix` -> Bug Fixes
   - `perf` -> Performance Improvements
   - `docs` -> Documentation
   - `BREAKING CHANGE` -> Breaking Changes
4. **Бамп версии**: Обновление версии в `package.json`.
5. **Обновление CHANGELOG.md**: Запись красивого структурированного релиза с датой.
6. **Git Commit & Tag**: Создание коммита `chore(release): vX.Y.Z` и тега `vX.Y.Z`.

## Пример вывода
```
## 🏷️ Релиз v1.1.0 успешно подготовлен!

- **Тип бампа**: minor
- **Новая версия**: 1.1.0
- **Тег создан**: `v1.1.0`
- **CHANGELOG.md**: Обновлен

Чтобы запушить релиз с тегами:
```bash
git push && git push --tags
```
```
