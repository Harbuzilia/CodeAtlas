# OpenCode System — Полная сводка функционала

## Обзор системы

**20 агентов** | **5 workflows** | **6 MCP серверов** | **2 плагина**

---

## 🤖 Агенты

### Core — Умные ассистенты (выбор через `tab agents`)

| Агент | Когда использовать | Ключевые особенности |
|-------|-------------------|---------------------|
| **OpenAgent** | Любые задачи — вопросы, документы, координация | Execution paths: conversational / task. Делегирует субагентам. |
| **OpenCoder** | Написание и модификация кода | C#/Python/Vue экспертиза. 6-stage workflow. Incremental execution. |

### Development — Специалисты

| Агент | Когда использовать |
|-------|-------------------|
| **Frontend Specialist** | UI/UX, React, Vue, CSS, анимации |
| **Backend Specialist** | API, базы данных, серверы |
| **DevOps Specialist** | CI/CD, Docker, Kubernetes |

### Meta — Мета-агенты

| Агент | Когда использовать |
|-------|-------------------|
| **System Builder** | Генерация новых .opencode систем с нуля |

### Build — Специализированные кодеры

| Агент | Язык/Стек |
|-------|-----------|
| **csharp-senior-developer** | C# / .NET / WPF |
| **python-senior-developer** | Python / FastAPI |
| **typescript-vue-developer** | Vue 3 / TypeScript |

### Subagents — Помощники

| Субагент | Триггеры | Назначение |
|----------|----------|-----------|
| **context-scout** | "какие стандарты", "найди контекст" | Поиск контекста перед задачей |
| **tester** | "напиши тесты", "TDD" | Написание тестов |
| **reviewer** | "проверь код", "ревью" | Code review (read-only) |


### System Builder Subagents

| Субагент | Назначение |
|----------|-----------|
| **domain-analyzer** | Анализ домена, рекомендации агентов |
| **agent-generator** | Генерация XML-оптимизированных агентов |
| **context-organizer** | Организация context файлов |
| **workflow-designer** | Дизайн workflows |
| **command-creator** | Создание slash-команд |

---

## 📋 Workflows (команды)

| Команда | Описание |
|---------|----------|
| `/feature` | Полный цикл разработки фичи — от плана до коммита |
| `/bugfix` | Быстрое исправление бага с тестами |
| `/refactor` | Глубокий рефакторинг с планом и итерациями |
| `/review` | Code Review с чеклистом безопасности и качества |
| `/tasks` | Обработка задач из PLAN.md |

---

## 🔄 Принципы работы агентов

### 1. Approval Gate
```
План → Одобрение пользователя → Выполнение
```
Агент НИКОГДА не выполняет write/edit/bash без одобрения.

### 2. Context Loading
```
ПЕРЕД любым кодом → Загрузить context/core/standards/code.md
```

### 3. Memory Protocol
```
ПЕРЕД: Прочитать ARCHITECTURE.md, DECISIONS.md
ПОСЛЕ: Обновить если пробовал новый подход
```

### 4. Incremental Execution
```
Шаг 1 → Валидация → Шаг 2 → Валидация → ...
```
Никогда не выполняет весь план сразу.

### 5. Stop on Failure
```
Ошибка → СТОП → Отчёт → Предложить fix → Ждать одобрения
```

---

## 📁 Context файлы (загружаются автоматически)

| Файл | Когда загружается |
|------|------------------|
| `context/core/standards/code.md` | Любой код |
| `context/core/standards/tests.md` | Тесты |
| `context/core/standards/docs.md` | Документация |
| `context/core/workflows/delegation.md` | Делегирование субагентам |

---

## 🔌 MCP серверы

| Сервер | Инструменты |
|--------|------------|
| **Context7** | context7_resolve, context7_get |
| **Playwright** | browser automation |
| **Memory** | memory_store, memory_retrieve |
| **Filesystem** | filesystem_* |

---

## ⚡ Плагины

| Плагин | Назначение |
|--------|-----------|
| **antigravity-auth** | Доступ к Gemini/Claude моделям |
| **DCP** | Экономия токенов |

---

## 🎯 Router (быстрая маршрутизация)

Router автоматически направляет запросы:

| Триггер | Агент |
|---------|-------|
| "какие стандарты" | context-scout |
| "найди пример" | planning/research-codebase |
| "напиши тесты" | tester |
| "проверь код" | reviewer |
| "разбей на задачи" | planning/decomposition |


---

## 🏗️ System Builder — генерация систем

**Workflow:**
```
Interview → DomainAnalysis → PlanArchitecture → GenerateAgents → OrganizeContext → CreateCommands → Register → Validate
```

**Пример:**
```
"Создай систему для e-commerce"

Результат:
├── agent/ecommerce/orchestrator.md
├── agent/ecommerce/order-processor.md
├── context/domain/products.md
├── context/domain/orders.md
└── command/new-order.md
```

---

## 📊 Model Variants

| Вариант | Когда использовать |
|---------|-------------------|
| `minimal` | Простые вопросы |
| `low` | Исследование кода |
| `medium` | Стандартная разработка |
| `high` | Сложные задачи |
| `max` | Критические решения |

---

## 🗂️ Структура проекта

```
agent/
├── core/           # OpenAgent, OpenCoder
├── development/    # Frontend, Backend, DevOps
├── meta/           # System Builder
├── build/          # C#, Python, Vue
├── subagents/      # Помощники
│   └── system-builder/  # 5 субагентов
├── planning/       # Router и др.
└── orchestrator/   # Workflow Builder

context/
├── core/
│   ├── standards/  # code.md, tests.md, docs.md
│   └── workflows/  # delegation.md
└── project/        # Проектные паттерны

command/            # Slash-команды
.agent/workflows/   # /feature, /bugfix и др.
```
