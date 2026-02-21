# Context Index | Индекс контекста

## Purpose | Цель

Этот файл — центральный индекс всех context файлов.
Агенты используют его для определения какой context загружать.

---

## Quick Reference | Быстрая справка

| Task Type | Context File |
|-----------|--------------|
| Code (write/edit) | `core/standards/code.md` |
| Tests | `core/standards/tests.md` |
| Documentation | `core/standards/docs.md` |
| General patterns | `core/essential-patterns.md` |
| Project-specific | `project/patterns.md` |
| Delegation | `core/workflows/delegation.md` |

---

## Core Contexts | Базовые контексты

### `core/essential-patterns.md`
Triggers: любой код, общие паттерны
Contains: Pure functions, error handling, security, SOLID краткий

### `core/standards/code.md`
Triggers: write code, edit code, implement, create class/function
Contains: Language-specific standards (C#, Python, TS), SOLID детально

### `core/standards/tests.md`
Triggers: write tests, tdd, unit test, integration test
Contains: AAA pattern, positive/negative tests, mocking, frameworks

### `core/standards/docs.md`
Triggers: write docs, documentation, readme
Contains: Document templates, comment standards, API docs format

---

## Workflow Contexts | Контексты workflow

### `core/workflows/review.md`
Triggers: code review, ревью, проверь код
Contains: Review checklist, Conventional Comments, severity levels

### `core/workflows/delegation.md`
Triggers: delegate, передай, используй subagent
Contains: When to delegate, context bundling, handoff format

---

## Project Contexts | Проектные контексты

### `project/patterns.md`
Triggers: project-specific code
Contains: Patterns specific to THIS project (architecture, conventions)

---

## Loading Rules | Правила загрузки

### For Agents

```
BEFORE executing any write/edit:
1. Determine task type (code, test, docs, review)
2. Load corresponding context from this index
3. Apply context to your work
```

### For Subagents

```
WHEN delegating to subagent:
1. Create context bundle at .tmp/sessions/{id}/context.md
2. Include all relevant context files
3. Tell subagent to load bundle first
```

---

## Structure | Структура

```
context/
├── index.md              # ← YOU ARE HERE
├── core/
│   ├── essential-patterns.md
│   ├── standards/
│   │   ├── code.md
│   │   ├── tests.md
│   │   └── docs.md       # NEW
│   └── workflows/
│       ├── review.md
│       └── delegation.md
└── project/
    └── patterns.md
```
