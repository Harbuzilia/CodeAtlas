---
description: Интерактивная карта мультиагентной системы, бюджеты шагов, права на файлы и реестр 37 навыков
---

# Matrix Command | Команда /matrix

## Назначение
Вывести подробную живую матрицу всех 12 активных агентов, их бюджетов шагов (`steps`), прав записи, полного реестра из 37 специализированных навыков и 23 slash-команд.

## Вход
- `/matrix` — вывод полной таблицы агентов и навыков (эквивалент `npm run matrix`)
- `/matrix <агент>` (например, `/matrix coder` или `/matrix devops`) — детальная карточка конкретного агента

## Пример вывода (`node scripts/agent-matrix.mjs`)
```
🤖 Active Agents (12):

| Agent ID       | Steps | Role                            | Write Permissions             |
| :------------- | :---- | :------------------------------ | :---------------------------- |
| architect      |    30 | Системный архитектор — проектирование расп | write, edit                   |
| coder          |    50 | Супер-кодер — любой язык + TDD mode + глуб | write, edit, patch            |
| contextscout   |    30 | Субагент для поиска и извлечения релевантн | Read-only                     |
| debugger       |    25 | Агент для автоматического исправления ошиб | write, edit                   |
| devops         |    30 | DevOps & Infrastructure Engineer — Docker, | write, edit                   |
| docwriter      |    15 | Автогенерация и обновление документации | write, edit                   |
| externalscout  |    25 | Получает актуальную документацию библиотек | Read-only                     |
| openagent      |    50 | Универсальный ассистент — координация, воп | write, edit, patch            |
| planner        |    40 | Unified Planner Agent - Task decomposition | write, edit                   |
| reviewer       |    40 | Code Review агент - безопасность, качество | Read-only                     |
| tester         |    25 | TDD-агент для создания тестов - Test-Drive | write, edit                   |
| uitester       |    25 | Visual UI Tester - проверяет визуальную ве | Read-only                     |

🛠️  Validated Skills (37 total):
`api-change-safe`, `api-openapi-spec`, `architecture-adr`, `ast-index`, `caching-redis-strategy`, `code-modernization-patterns`, `config-migration`, `context7`, `csharp`, `database-sql`, `db-migration-safety`, `devops-docker`, `docs-sync`, `e2e-playwright`, `event-driven-messaging`, `feature-flags-trunk-based`, `frontend-design`, `git`, `git-conflict-resolution`, `grpc-graphql-contracts`, `i18n-localization`, `incident-response`, `micro-frontends-federation`, `mock-service-virtualization`, `observability-opentelemetry`, `performance-optimization`, `prompt-engineering-advanced`, `python`, `repomap`, `react-next-modern`, `review-code-checklist`, `review-code-strategy`, `secrets-config-management`, `security-owasp`, `security-sast`, `typescript`, `websocket-realtime-events`

⚡ Slash Commands (23 total):
/arch, /bootstrap, /budget, /build-context-system, /commit, /conflict, /docgen, /doctor, /heal, /i18n, /infra, /matrix, /modernize, /optimize, /oracle, /plan, /pr, /prompt, /prompt-engineering/prompt-optimizer, /release, /review, /synthesize, /test
```

## Права записи
Колонка `Write Permissions` отражает фактические `tools:` агента: `write`/`edit`/`patch` включены только у пишущих агентов; `contextscout`, `externalscout`, `reviewer`, `uitester` — строго read-only (bash у contextscout запрещён на уровне `permission.bash: "deny"`).

Бюджеты шагов берутся из фронтматтера `agents/*.md` (единый источник истины) и валидируются при каждом `npm run validate:all`.
