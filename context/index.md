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
| Stack-стандарты (Redis/Kafka/gRPC/WS/migrations/flags/MFE) | `standards/*.md` |

---

## Core Contexts | Базовые контексты

### `core/essential-patterns.md`
Triggers: любой код, общие паттерны
Contains: Pure functions, error handling, security, SOLID краткий

### `standards/*.md` (stack-стандарты, не скиллы)
Triggers: Redis/кэш, Kafka/очереди, gRPC/GraphQL, WebSockets/SSE, DB-миграции, feature-flags/trunk, micro-frontends
Contains: db-migration-safety, caching-redis-strategy, grpc-graphql-contracts, websocket-realtime-events, feature-flags-trunk-based, micro-frontends-federation, event-driven-messaging

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

### `core/workflows/resilience.md`
Triggers: resilience, reliability, fault-tolerance, circuit breaker
Contains: Resilience patterns, retry logic, circuit breaker, fallback strategies

### `core/workflows/delegation.md`
Triggers: delegate, передай, используй subagent
Contains: When to delegate, context bundling, handoff format

---

## Config Contexts | Конфигурационные контексты

### `core/config/paths.json`
Triggers: path resolution, file structure, project layout
Contains: Project path aliases, directory structure configuration

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

Контекст передаётся ВНУТРИ prompt делегирования (контракт Input/Expected Output/Done Criteria/Return Format + findings из `.opencode/findings.md`); отдельные context-bundle файлы не создаются.

---

## Structure | Структура

```
context/
├── index.md              # ← YOU ARE HERE
├── navigation.md
├── core/
│   ├── essential-patterns.md
│   ├── navigation.md
│   ├── config/
│   │   └── paths.json
│   ├── standards/
│   │   ├── code.md
│   │   ├── tests.md
│   │   └── docs.md
│   └── workflows/
│       ├── delegation.md
│       ├── resilience.md
│       ├── review.md
└── project/
    ├── navigation.md
    └── patterns.md
```
