---
description: Интерактивная карта мультиагентной системы, бюджеты шагов, права на файлы и реестр 37 навыков
---

# Matrix Command | Команда /matrix

## Назначение
Вывести подробную живую матрицу всех 12 активных субагентов, их бюджетов шагов (`steps`), прав доступа на файлы, используемых инструментов и полного реестра из 36 специализированных навыков.

## Вход
- `/matrix` — вывод полной таблицы агентов и навыков
- `/matrix <агент>` (например, `/matrix coder` или `/matrix devops`) — детальная карточка конкретного агента

## Пример вывода
```
====================================================
        📋 OPENCODE AGENT CAPABILITY MATRIX        
====================================================

| openagent    | 50 | Оркестратор & Ambient Optimizer | write, edit, patch |
| contextscout | 12 | Скаут кодовой базы (AST/Git)    | Только чтение (read-only) |
| coder        | 50 | Супер-кодер (любой язык + TDD) | write, edit, patch |
| tester       | 25 | TDD-агент (AAA unit/integration) | write, edit |
| reviewer     | 12 | Code Review (SAST, READ-ONLY)   | Только чтение (read-only) |
| debugger     | 25 | Диагност ошибок & Self-Learning | write, edit |
| planner      | 40 | Декомпозитор задач (INVEST)     | write, edit |
| externalscout| 12 | Скаут внешних API & Context7    | Только чтение (read-only) |
| docwriter    | 15 | Технический писатель            | write, edit |
| uitester     | 25 | UI/E2E тестировщик              | Только чтение (read-only) |
| architect    | 30 | Системный архитектор (ADR/C4)   | write, edit |
| devops       | 30 | DevOps & Инфраструктура         | write, edit |
| openagent    | 40 | Оркестратор & Ambient Optimizer | task_state, navigation |
| contextscout | 12 | Скаут кодовой базы (AST/Git)    | Только чтение (read-only) |
| coder        | 35 | Разработчик (Clean Arch/TDD)   | src/**, tests/** |
| tester       | 25 | Тестировщик (Unit/Integration)  | tests/**, *.spec.* |
| reviewer     | 12 | SAST & Security ревьюер        | Только чтение (read-only) |
| debugger     | 25 | Диагност ошибок & Self-Learning| lessons_learned.md |
| planner      | 15 | Декомпозитор задач (INVEST)     | task_state.md, plans/** |
| externalscout| 12 | Скаут внешних API & Context7    | Только чтение (read-only) |
| docwriter    | 15 | Технический писатель            | docs/**, *.md |
| uitester     | 20 | UI/E2E Тестировщик интерфейсов  | e2e/** |
| architect    | 25 | Системный архитектор (ADR/C4)   | docs/adr/** |
| devops       | 30 | DevOps & Инфраструктура         | Dockerfile*, compose*, k8s/** |
🛠️ Валидированных навыков: 36
⚡ Slash-команд: 23

====================================================
```
