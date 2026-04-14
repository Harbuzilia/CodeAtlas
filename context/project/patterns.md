# Project Patterns | Паттерны проекта

## Purpose | Цель

Этот файл фиксирует реальные паттерны текущего runtime-проекта `Opencode1`.
Используй его как project-specific слой поверх `context/core/*`.

---

## Project Identity | Профиль проекта

- Project: `Opencode1`
- Domain: агентная оркестрация, делегация задач, контекст-управление
- Runtime orchestrator: `agents/openagent.md`
- Runtime agent tree: `agents/*.md`
- Context root: определяется через `context/core/config/paths.json`

Canonical SoT:
1. `opencode.json`
2. `agents/*.md`
3. `context/**/*.md`
4. `instructions.md`

Rule: если есть конфликт в документации, следуй `opencode.json`.

---

## Architecture Patterns | Архитектурные паттерны

### 1) Single Runtime Router
- Все задачи входят через `agents/openagent.md`.
- OpenAgent сначала делает context discovery, затем route/delegate/validate.
- Прямой вызов сабагентов допустим для тестов/отладки, но не как основной поток.

### 2) Canonical Delegation IDs Only
Используй только эти имена агентов (для Task tool):
- `contextscout`
- `coder`
- `debugger`
- `tester`
- `reviewer`
- `planner`
- `externalscout`
- `docwriter`

Запрещены legacy IDs:
- `specialist/*`
- `planning/planner`
- `planning/decomposition`
- `research/external-scout`
- `subagents/external-scout`
- `core/opencoder`

### 3) Contract-First Delegation
Каждая делегация должна включать:
- `Input`
- `Expected Output`
- `Done Criteria`
- `Return Format`

Если контракт неполный -> не делегировать, сначала запросить/уточнить вход.

### 4) Planner as Fan-Out Controller
- Для задач 4+ файлов сначала `planner`.
- Planner выдает подзадачи с явным именем агента и контрактом.
- Исполнение без декомпозиции допустимо только для простых задач.

---

## Context and Paths | Контекст и пути

### Path Governance
- Перед context discovery читать `context/core/config/paths.json`.
- Резолвить `<context_root>` через `paths.local` (fallback: `context`).
- Дальше читать `<context_root>/navigation.md` и связанные файлы.

### No Hardcoded Context Paths in Runtime Prompts
- В runtime агентных промптах избегать жестких `context/...` путей (кроме чтения самого `paths.json`).
- Опираться на `<context_root>`.

---

## Validation Pattern | Паттерн валидации

Перед изменениями runtime-контура (`opencode.json`, `agents/*.md`, `context/**/*.md`) запускать:
- `npm run validate:runtime`

Что должно оставаться инвариантом:
- пути из `opencode.json.agent[*].path` существуют;
- имена агентов в runtime файлах существуют в `opencode.json`;
- legacy ID не используются.

---

## Documentation Hygiene | Гигиена документации

- Runtime точка входа: `PROJECT_GUIDE.md`.
- Исторические материалы: `docs/legacy/history/` и `docs/legacy/archive/`.
- Файлы с пометкой legacy не использовать как источник runtime-правды.

---

## Practical Defaults | Практические дефолты

- При сомнении в маршрутизации: `contextscout -> openagent route decision`.
- При внешних библиотеках: подключать `context7` skill и/или `externalscout`.
- При ошибках сборки/рантайма: `debugger` с воспроизводимым входом.
- При проверке качества: `reviewer` (read-only).

---

## Anti-Patterns | Антипаттерны

- Смешивать runtime и reference-проекты в одном execution flow.
- Использовать файлы из `references/*` как runtime source of truth.
- Добавлять новые agent IDs без обновления `opencode.json`.
- Доверять `registry.json` как execution source.
- Возвращать в активный поток legacy-схемы имен.
