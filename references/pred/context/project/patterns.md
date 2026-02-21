# Project Patterns | Паттерны проекта

## Purpose | Цель

Этот файл фиксирует реальные паттерны текущего runtime-проекта `Opencode1`.
Используй его как project-specific слой поверх `context/core/*`.

---

## Project Identity | Профиль проекта

- Project: `Opencode1`
- Domain: агентная оркестрация, делегация задач, контекст-управление
- Runtime orchestrator: `core/openagent`
- Runtime agent tree: `.opencode/agent/**`
- Context root: определяется через `context/core/config/paths.json`

Canonical SoT:
1. `opencode.json`
2. `.opencode/agent/**/*.md`
3. `context/**/*.md`
4. `instructions.md`

Rule: если есть конфликт в документации, следуй `opencode.json`.

---

## Architecture Patterns | Архитектурные паттерны

### 1) Single Runtime Router
- Все задачи входят через `core/openagent`.
- OpenAgent сначала делает context discovery, затем route/delegate/validate.
- Прямой вызов сабагентов допустим для тестов/отладки, но не как основной поток.

### 2) Canonical Delegation IDs Only
Используй только эти `subagent_type`:
- `subagents/core/contextscout`
- `subagents/code/coder-agent`
- `subagents/core/debugger`
- `subagents/code/tester`
- `subagents/code/reviewer`
- `planning/decomposition`
- `subagents/research/externalscout`
- `subagents/core/docwriter`

Запрещены legacy IDs:
- `specialist/*`
- `planning/planner`
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
- Для задач 4+ файлов сначала `planning/decomposition`.
- Planner выдает подзадачи с явным `subagent_type` и контрактом.
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

Перед изменениями runtime-контура (`opencode.json`, `.opencode/agent/**/*.md`, `context/**/*.md`) запускать:
- `npm run validate:runtime`

Что должно оставаться инвариантом:
- пути из `opencode.json.agent[*].path` существуют;
- `subagent_type` в runtime файлах существует в `opencode.json`;
- legacy ID не используются.

---

## Documentation Hygiene | Гигиена документации

- Runtime точка входа: `PROJECT_GUIDE.md`.
- Исторические материалы: `docs/legacy/history/` и `docs/legacy/archive/`.
- Файлы с пометкой legacy не использовать как источник runtime-правды.

---

## Practical Defaults | Практические дефолты

- При сомнении в маршрутизации: `contextscout -> openagent route decision`.
- При внешних библиотеках: подключать `skill/tools/context7.md` и/или `subagents/research/externalscout`.
- При ошибках сборки/рантайма: `subagents/core/debugger` с воспроизводимым входом.
- При проверке качества: `subagents/code/reviewer` (read-only).

---

## Anti-Patterns | Антипаттерны

- Смешивать runtime и reference-проекты в одном execution flow.
- Использовать файлы из `references/*` как runtime source of truth.
- Добавлять новые agent IDs без обновления `opencode.json`.
- Доверять `registry.json` как execution source.
- Возвращать в активный поток legacy-схемы имен.
