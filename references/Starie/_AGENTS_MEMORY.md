# PROJECT MEMORY & ARCHITECTURE

## 🚀 Current Goal
- [x] ROADMAP Implementation — 16 пунктов
- [x] Router fixes
- [x] OpenAgents features — субагенты
- [x] OpenAgent + OpenCoder — умные ассистенты
- [x] Specialists + System Builder — полная реализация

## 🛠 Tech Stack
- **OpenCode** with plugins: antigravity-auth, DCP
- **MCP Servers**: Context7, Playwright, Memory, Filesystem

## 🧠 Agents Summary (20 агентов)


### Core Agents (2)
| Агент | Назначение |
|-------|-----------|
| `core/openagent` | Универсальный умный ассистент |
| `core/opencoder` | Супер-кодер (любой язык + C#/Python/Vue) |

### Development Specialists (3)
| Агент | Назначение |
|-------|-----------|
| `development/frontend-specialist` | UI/UX, React, Vue, CSS |
| `development/backend-specialist` | API, базы данных, серверы |
| `development/devops-specialist` | CI/CD, Docker, Kubernetes |

### Meta Agents (1)
| Агент | Назначение |
|-------|-----------|
| `meta/system-builder` | Генерация новых .opencode систем |

### System Builder Subagents (5)
| Субагент | Назначение |
|----------|-----------|
| `domain-analyzer` | Анализ домена (17KB) |
| `agent-generator` | Генерация агентов (16KB) |
| `context-organizer` | Организация контекстов (11KB) |
| `workflow-designer` | Дизайн workflows (8KB) |
| `command-creator` | Создание команд (6KB) |

### Build Agents (3)
| Агент | Назначение |
|-------|-----------|
| `build/csharp-senior-developer` | C# / .NET |
| `build/python-senior-developer` | Python |
| `build/typescript-vue-developer` | Vue / TypeScript |

### Subagents (3)
| Агент | Назначение |
|-------|-----------|
| `subagents/context-scout` | Поиск контекста |
| `subagents/tester` | TDD / тесты |
| `subagents/reviewer` | Code review |


### Other
| Агент | Назначение |
|-------|-----------|
| `planning/router` | Быстрая маршрутизация |
| `orchestrator/workflow-builder` | Генерация workflows |
| `ask/code` | Ответы на вопросы |

## 📁 Context Files
- `context/core/standards/code.md`
- `context/core/standards/tests.md`
- `context/core/standards/docs.md`
- `context/core/workflows/delegation.md`
- `context/core/essential-patterns.md`

## 📦 Recent Changes Log
- 2026-01-27: (Research) Анализ `opencode.json` и `AGENTS.md`. Найдено ограничение `"bash": "ask"`.
- 2026-01-19: Консолидация агентов: planning/decomposition и planning/research-codebase заменили subagents/task-manager и subagents/codebase-pattern-analyst
- 2026-01-19: Обновлен router: добавлен роутинг на core/opencoder и development/*, удален лишний agent block `router`
- 2026-01-19: default_agent переключен на `core/openagent`, router переведен в режим строгой делегации
- 2026-01-19: Зарегистрированы команды `/menu`, `/commit`, `/prompt-optimizer` и расширены tool-разрешения для planning/router, ask/code, planning/*, orchestrator/workflow-builder
- 2026-01-19: Удален `ROADMAP.md`
- 2026-01-19: Удалены `OpenAgents-0.5.0`, `opencodeG.json`, `_SCRATCHPAD.md`, `TASK_CONTEXT_SCOUT.md`, `node_modules`
- 2026-01-19: DCP уведомления изменены на normal в `.opencode/dcp.jsonc`
- 2026-01-19: Добавлена команда `command/build-context-system.md` и зарегистрирована в `opencode.json`
- 2026-01-19: Обновлено меню `command/menu.md` (добавлен Build Context System)
- 2026-01-19: Добавлен запрос бэкапа (.mds) перед записью в `command/prompt-engineering/prompt-optimizer.md`
- 2026-01-19: Добавлена команда `command/prompt-engineering/prompt-optimizer.md` для оптимизации промптов
- 2026-01-19: Добавлена команда `command/menu.md` для стартового меню (OpenAgent/OpenCoder/Router)
- 2026-01-18: Создал полноценный system-builder с 5 субагентами
- 2026-01-18: Зарегистрировал все 5 субагентов system-builder в opencode.json
- 2026-01-18: Обновил system-builder с routing к субагентам

