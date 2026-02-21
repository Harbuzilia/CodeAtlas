# Changelog

Все заметные изменения в этом проекте будут документироваться в этом файле.

Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.0.0/).

---

## [Unreleased]

### Добавлено
- **`agent/subagents/debugger.md`** — Агент автоматического исправления ошибок сборки
  - Парсинг ошибок C#, Python, TypeScript, Go
  - Классификация: syntax, type, reference, dependency, runtime
  - Цикл fix → build → validate (max 3 попытки)
  - Интегрирован в OpenCoder (auto-invoke при build errors)
  - **НЕ добавлен** auto-invoke в OpenAgent (можно добавить позже)
- `subagents/context-scout` теперь вызывается **обязательно** перед каждой задачей
- Команда `command/build-context-system.md` и регистрация `/build-context-system`
- Регистрация `/menu`, `/commit`, `/prompt-optimizer`

### Изменено
- default agent: `core/openagent`, router — строгая делегация и расширенный роутинг
- Консолидация агентов: planning/decomposition и planning/research-codebase вместо subagents

### Удалено
- Удалены `OpenAgents-0.5.0`, `ROADMAP.md`, `opencodeG.json`, `node_modules`, рабочие заметки

## [2.0.0] - 2026-01-17


### ✨ Добавлено

**Новые Subagents:**
- `agent/subagents/tester.md` — TDD-агент с Arrange-Act-Assert паттерном, positive/negative тесты, билингвальный
- `agent/subagents/reviewer.md` — Read-only code review агент, OWASP security checks, билингвальный


**Context система:**
- `context/index.md` — Центральный индекс всех контекстов
- `context/core/essential-patterns.md` — Базовые паттерны разработки
- `context/core/standards/code.md` — Стандарты кода (SOLID, async, 3 языка)
- `context/core/standards/tests.md` — Стандарты тестирования (AAA, mocking)
- `context/project/patterns.md` — Шаблон для проектных паттернов

**Новые команды:**
- `command/commit.md` — Conventional commits с emoji и авто-анализом

**Конфигурация:**
- CCS-AGY provider для локального прокси с failover
- Playwright MCP server для browser automation
- Model variants (minimal, low, medium, high, max)

### 🔧 Изменено

**Build агенты (C#, Python, TypeScript):**
- Добавлен `critical_context_requirement` — загрузка стандартов перед кодом
- Добавлен `approval_gate` — план перед реализацией
- Добавлен `incremental_execution` — по одному компоненту за раз
- Добавлен `stop_on_failure` — остановка при ошибках

**Router агент:**
- Добавлена секция `available_subagents` с tester, reviewer

- Улучшен workflow с auto-detection языка проекта

### 📚 Вдохновлено

Эти изменения вдохновлены OpenAgents v0.5.0, но адаптированы под нашу специализированную архитектуру с глубокой экспертизой в C#, Python и Vue/TypeScript.

---

## [1.0.0] - Initial Release

- Базовая структура с 12 агентами
- 7 skills
- Router с маршрутизацией по сложности
- Antigravity OAuth интеграция

---

*Changelog поддерживается вручную. Не забывайте обновлять при major изменениях!*

