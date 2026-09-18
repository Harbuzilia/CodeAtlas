# PLANS & ROADMAP

Практический трекер выполненных работ и архитектурный roadmap.

---

## 1. Выполненные задачи и статус внедрения (Done Log)

### ✅ Аудит, стабилизация и исправление багов (Batch 1)
- [x] **Windows CRLF Regex Fix**: Исправлен парсинг YAML Frontmatter в `validate-runtime-governance.mjs` и `validate-frontmatter-sync.mjs`.
- [x] **MCP & Config Cleanup**: Очищен битый `echovault` и захардкоженный `filesystem` в `opencode.json`.
- [x] **Gitignore Hygiene**: Удалены `package.json` и `.gitignore` из `.gitignore`, добавлены временные директории и runtime-файлы.
- [x] **Agent Tools Fix**: Агенту `planner` включены инструменты `edit` и `write` для управления `.opencode/task_state.md`.
- [x] **Contradiction Removal & Token Squeezing**: Устранено противоречие по `bash` в `contextscout.md`, убраны дубли правил в `openagent.md`.
- [x] **Native Windows PowerShell Init**: Создан скрипт `opencode-init.ps1` с поддержкой Directory Junctions без прав администратора.

### ✅ Инженерные навыки и DX-инструменты (Batch 2)
- [x] **4 новых навыка (Skills)**:
  - `performance-optimization` — профилирование CPU/памяти, N+1 ORM fix, streaming, бенчмаркинг.
  - `e2e-playwright` — Page Object Model, локаторы `getByRole`/`getByTestId`, скриншотная регрессия.
  - `api-openapi-spec` — OpenAPI 3.1 Spec-first проектирование, DTO валидация.
  - `security-sast` — статический аудит безопасности OWASP Top 10, SSRF/IDOR/Secrets, аудит зависимостей.
- [x] **Самообучение (Knowledge Base)**: Внедрены теги стека в `.opencode/lessons_learned.md` и скрипт `scripts/sync-lessons.mjs` (`npm run lessons:sync`).
- [x] **Стек Slash-команд**: Внедрен `/optimize`, обновлены `/review`, `/test`, `/plan`, `/commit`.
- [x] **DX Автоматизация**: Добавлены скрипты `repomap:generate`, `ast:rebuild`, `history:clean`.

### ✅ Расширенный Enterprise-пакет (Batch 3)
- [x] **Автоматический Git Pre-commit Hook**: Скрипт `scripts/setup-hooks.mjs` (`npm run setup:hooks`) и хук `.githooks/pre-commit` для блокировки коммитов с ошибками.
- [x] **Эвалюатор маршрутизации (Route Evaluator)**: Скрипт `scripts/eval-scenarios.mjs` (`npm run eval:routes`) для валидации 12+ сценариев маршрутизации без затрат токенов.
- [x] **Супер-скилл современного фронтенда**: `skills/react-next-modern/SKILL.md` (React 19, Next.js 15, Tailwind v4, Zustand v5, TanStack Query).
- [x] **Архитектурный субагент**: `agents/architect.md` + скилл `skills/architecture-adr/SKILL.md` (ADR + C4/Sequence Mermaid).
- [x] **Автогенератор индекса контекста**: `scripts/sync-context-index.mjs` (`npm run context:index`) для актуализации `context/navigation.md`.
- [x] **Дашборд телеметрии и статистики**: `scripts/session-stats.mjs` (`npm run stats`).
- [x] **Dynamic Task Recovery**: Автоматическое распознавание незавершенных задач в `openagent.md`.

### ✅ Enterprise CI/CD, DB Safety, Mocking & Multi-Target Sync (Batch 4)
- [x] **Автономный Git Push & PR Workflow**: Команда `/pr` (`command/pr.md`) и скрипт `scripts/create-pr.mjs` (`npm run pr`) для автоматической проверки, коммита, пуша и создания PR.
- [x] **GitHub Actions CI Workflow**: Пайплайн `.github/workflows/ci.yml` с автоматическим запуском всех Quality Gates на каждый push и pull_request.
- [x] **Радар технического долга (Tech Debt Radar)**: Скрипт `scripts/tech-debt-radar.mjs` (`npm run radar`) для поиска God-файлов (>350 строк), глубокой вложенности и висящих TODO.
- [x] **Навык безопасных миграций БД**: `skills/db-migration-safety/SKILL.md` (Expand-Contract, non-blocking DDL, rollback scripts).
- [x] **Навык виртуализации и мокирования API**: `skills/mock-service-virtualization/SKILL.md` (MSW, in-memory fixtures, offline testing).
- [x] **Мультиплатформенный синхронизатор**: `scripts/sync-targets.mjs` (`npm run sync:all`) для экспорта в OpenCode (`~/.config/opencode`), Pi (`~/.config/pi`) и OhMyPi (`~/.pi`).
- [x] **Протокол отказоустойчивости моделей**: `context/core/workflows/resilience.md` (обработка HTTP 429, retry mesh, fallback на резервные модели).

### ✅ DevOps Agent, Observability, SemVer Release, Secret Scanner & i18n (Batch 5)
- [x] **Субагент DevOps & Инфраструктура**: `agents/devops.md` + команда `/infra` (`command/infra.md`) для автоматизации Docker, Compose, K8s, Nginx, CI/CD.
- [x] **Навык Observability & OpenTelemetry**: `skills/observability-opentelemetry/SKILL.md` (Distributed tracing, W3C correlation ID, Prometheus, Health checks).
- [x] **Автоматический генератор релизов SemVer**: Команда `/release` (`command/release.md`) и скрипт `scripts/release-gen.mjs` (`npm run release`) для бампа версии, авто-changelog и git tag.
- [x] **Сканер утечек секретов**: Скрипт `scripts/scan-secrets.mjs` (`npm run scan:secrets`) с интеграцией в `.githooks/pre-commit` и `/pr`.
- [x] **Навык интернационализации (i18n)**: `skills/i18n-localization/SKILL.md` + команда `/i18n` (`command/i18n.md`) для проверки словарей и отсутствующих переводов.
- [x] **Кросс-экосистемный аудитор зависимостей**: `scripts/audit-deps.mjs` (`npm run audit:deps`) для аудита CVE и лицензий (Node/Python/.NET).

### ✅ Dual-Mode Prompting, AST Impact, Test Gap, Redis & gRPC (Batch 6)
- [x] **Двухрежимный Промпт-Оптимизатор**: `skills/prompt-engineering-advanced/SKILL.md` + команда `/prompt` (`command/prompt.md`) + фоновый Ambient Request Optimizer в `openagent.md`.
- [x] **Анализатор радиуса поражения изменений (AST Impact)**: Скрипт `scripts/ast-impact.mjs` (`npm run impact`) для анализа зависимых сервисов по `git diff`.
- [x] **Анализатор пробелов в тестах (Test Coverage Gap)**: Скрипт `scripts/test-coverage-gap.mjs` (`npm run test:gap`) для выявления нетестированных экспортов.
- [x] **Навык Caching & Redis Strategy**: `skills/caching-redis-strategy/SKILL.md` (Cache-Aside, SingleFlight, Stampede prevention, Tagged invalidation).
- [x] **Навык gRPC & GraphQL Contracts**: `skills/grpc-graphql-contracts/SKILL.md` (Protobuf 3 backward compatibility, GraphQL DataLoader N+1 fix).
- [x] **Генератор документации из AST**: Команда `/docgen` (`command/docgen.md`) и скрипт `scripts/doc-generator.mjs` (`npm run docgen`).

### ✅ Token Budget Tracker, WebSockets, Conflict Resolver, Feature Flags, Micro-Frontends & Benchmarks (Batch 7)
- [x] **Трекер бюджета токенов и стоимости**: Команда `/budget` (`command/budget.md`) и скрипт `scripts/token-budget-tracker.mjs` (`npm run budget`) для анализа затрат USD по агентам.
- [x] **Навык WebSockets, SSE & Real-Time Events**: `skills/websocket-realtime-events/SKILL.md` (Heartbeat, reconnection backoff, SSE, Redis Pub/Sub).
- [x] **Интеллектуальный резолвер Git конфликтов**: Команда `/conflict` (`command/conflict.md`) и навык `skills/git-conflict-resolution/SKILL.md` для 3-стороннего слияния.
- [x] **Навык Feature Flags & Trunk-Based Dev**: `skills/feature-flags-trunk-based/SKILL.md` (Canary rollouts, fallback safety, flag lifecycle).
- [x] **Навык Micro-Frontends & Module Federation**: `skills/micro-frontends-federation/SKILL.md` (Module Federation 2.0, singletons, event bus, Error Boundaries).
- [x] **Бенчмарк производительности и регрессий**: Скрипт `scripts/run-benchmarks.mjs` (`npm run bench`) для замера латентности всех утилит.

### ✅ Environment Doctor, Event-Driven Messaging, DB Explain, Modernizer & Agent Matrix (Batch 8)
- [x] **AI Environment Doctor**: Команда `/doctor` (`command/doctor.md`) и скрипт `scripts/opencode-doctor.mjs` (`npm run doctor`) для 360° диагностики манифестов и окружения.
- [x] **Навык Event-Driven Messaging & Outbox**: `skills/event-driven-messaging/SKILL.md` (Transactional Outbox, Kafka, RabbitMQ, Idempotent Consumer, DLQ).
- [x] **Советник по SQL-индексам (DB Query Advisor)**: Скрипт `scripts/db-query-advisor.mjs` (`npm run db:explain`) для оптимизации медленных запросов.
- [x] **Модернизатор легаси-кода**: Команда `/modernize` (`command/modernize.md`) и навык `skills/code-modernization-patterns/SKILL.md` (ESM, async/await, React 19).
- [x] **Навык управления конфигами и секретами**: `skills/secrets-config-management/SKILL.md` (12-Factor App, Zod runtime validation, masking).
- [x] **Инспектор матрицы возможностей агентов**: Команда `/matrix` (`command/matrix.md`) и скрипт `scripts/agent-matrix.mjs` (`npm run matrix`) для инспекции бюджетов шагов и прав.

### 👑 SSS-Tier (God-Tier) Architectural Breakthroughs
- [x] **Автономный цикл самовосстановления с авто-откатом (Autonomous Self-Healing Loop)**: Команда `/heal` (`command/heal.md`) и скрипт `scripts/autonomous-sandbox-loop.mjs` (`npm run heal`) с безопасным созданием снимков и авто-откатом при критических сбоях.
- [x] **Сквозной детектив дрифта контрактов (Contract Drift Sentinel)**: Скрипт `scripts/contract-drift-sentinel.mjs` (`npm run drift`) для обнаружения рассинхронизации типов и схем между БД ↔ Backend DTO ↔ Frontend Client.
- [x] **Протокол роя и общая память агентов (Swarm Shared Memory Slate)**: Регламент `context/core/workflows/swarm-protocol.md`, скрипт `scripts/swarm-memory.mjs` (`npm run memory`) и общая рабочая доска `.opencode/shared_memory.json` (экономия до 70% токенов).
- [x] **Сквозной синтезатор фич из одного запроса или спецификации**: Команда `/synthesize` (`command/synthesize.md`) и скрипт `scripts/spec-synthesizer.mjs` (`npm run synthesize`) для сквозного синтеза фич под ключ из текстового запроса или `.md` файла.
- [x] **Инкрементальный Smart-Тестер (Test Impact Analysis - TIA)**: Скрипт `scripts/smart-test-runner.mjs` (`npm run test:smart` / `/test --smart`) для запуска только затронутых тестов за миллисекунды.
- [x] **AI Chaos Engineer & Fault Injection**: Скрипт `scripts/chaos-resilience-tester.mjs` (`npm run test:chaos`) для симуляции сбоев, задержек и 429 штормов.
- [x] **AST Охотник за утечками памяти и ресурсов**: Скрипт `scripts/ast-leak-detector.mjs` (`npm run perf:leaks`) для выявления висящих таймеров и утечек памяти.
- [x] **Движок мутационного тестирования (Mutation Testing)**: Скрипт `scripts/mutation-test-runner.mjs` (`npm run test:mutate`) для оценки реального качества тестов.
- [x] **Сквозной визуализатор живой архитектуры C4**: Команда `/arch` (`command/arch.md`) и скрипт `scripts/arch-visualizer.mjs` (`npm run arch`) для генерации C4 Mermaid диаграмм.

### 🌌 Singularity SSSSSS-Tier Transcendent Capabilities
- [x] **AI Predictive Defect Oracle & Pre-Emptive Shield**: Команда `/oracle` (`command/oracle.md`) и скрипт `scripts/defect-oracle.mjs` (`npm run oracle`) для предсказания дефектов до их появления.
- [x] **Автономный AI PR-Ревьюер и Мердж-Бот**: Скрипт `scripts/ai-pr-bot.mjs` (`npm run pr:auto`) для комплексного расчета PR Risk Score и авто-мерджа.
- [x] **Детектив Flaky-тестов через Монте-Карло**: Скрипт `scripts/flaky-test-hunter.mjs` (`npm run test:flaky`) для устранения гонок асинхронности и недетерминированных тестов.
- [x] **Компактор долговременной памяти роя**: Скрипт `scripts/agent-memory-compactor.mjs` (`npm run memory:compact`) для семантического сжатия и экономии 85% токенов.
- [x] **Однокликовый бутстраппер боевой инфраструктуры**: Команда `/bootstrap` (`command/bootstrap.md`) и скрипт `scripts/prod-bootstrapper.mjs` (`npm run bootstrap`).

---

## 2. Текущая матрица системы

- **Агентов в реестре**: 12 (`openagent`, `contextscout`, `coder`, `tester`, `reviewer`, `debugger`, `planner`, `externalscout`, `docwriter`, `uitester`, `architect`, `devops`).
- **Скиллов в системе**: 45 навыков (100% валидированы).
- **Slash-команд**: 24 + сгенерированный `/menu` (`/commit`, `/plan`, `/review`, `/test`, `/optimize`, `/pr`, `/infra`, `/release`, `/i18n`, `/prompt`, `/prompt-engineering/prompt-optimizer`, `/docgen`, `/budget`, `/presets`, `/conflict`, `/doctor`, `/modernize`, `/matrix`, `/heal`, `/synthesize`, `/arch`, `/oracle`, `/bootstrap`, `/build-context-system`).
- **Модели и пресеты**: назначения моделей на агентов — `config/model-presets.json` (quality/balanced/cost/speed), применение `npm run models:apply -- <preset>`, гейт `validate:models`, команда `/presets`.
- **Quality Gates & CI**: 100% прохождение (`validate:all`, `smoke:functional`, `eval:routes`, `radar`, `scan:secrets`, `impact`, `test:gap`, `bench`, `budget`, `doctor`, `db:explain`, `matrix`, `heal`, `drift`, `synthesize`, `memory`, `test:smart`, `test:chaos`, `perf:leaks`, `test:mutate`, `arch`, `oracle`, `pr:auto`, `test:flaky`, `memory:compact`, `bootstrap`, `menu:gen`, `heal:config`, `telemetry`, `onboard`, `watch`).

---

## 3. Ближайшие направления развития

1. **Реальные стресс-тесты**: Регулярный прогон сценариев через `npm run eval:routes`, `npm run bench` и `npm run test:smart`.
2. **Мониторинг DCP**: Контроль сжатия контекста через плагин `@tarquinen/opencode-dcp`.
3. **Обновление версий**: Синхронизация версий внешних библиотек через Context7.
