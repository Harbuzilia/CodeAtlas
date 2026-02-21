# Архитектура проекта

> Этот файл описывает структуру проекта для агентов. Обновляйте при значительных изменениях.

---

## Структура директорий

```
/
├── agent/                 # Агенты OpenCode
│   ├── ask/               # Агенты для вопросов
│   ├── build/             # Build-агенты (C#, Python, Vue)
│   ├── orchestrator/      # Оркестраторы (workflow-builder)
│   ├── planning/          # Планирование (router)
│   └── subagents/         # Subagents (context-scout, tester, reviewer)

│
├── command/               # Команды (/commit, etc.)
│
├── context/               # Контексты и стандарты
│   ├── core/              # Базовые паттерны и стандарты
│   └── project/           # Проектные паттерны
│
├── skill/                 # Skills (api-design, code-review, etc.)
│
├── .agent/workflows/      # Готовые workflows
│
└── .opencode/             # Конфигурация OpenCode
```

---

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `opencode.json` | Главный конфиг OpenCode |
| `instructions.md` | Глобальные инструкции |
| `AGENTS.md` | Правила агентов |
| `DECISIONS.md` | История решений |
| `_AGENTS_MEMORY.md` | Память агентов |

---

## Агенты

### Build-агенты
| Агент | Специализация | Строк |
|-------|--------------|-------|
| `csharp-senior-developer` | C#, .NET, async | ~700 |
| `python-senior-developer` | Python, FastAPI, async | ~1000 |
| `typescript-vue-developer` | Vue, TypeScript, Vite | ~1100 |

### Subagents
| Агент | Назначение |
|-------|-----------|
| `context-scout` | Поиск контекста |
| `tester` | TDD, unit тесты |
| `reviewer` | Code review (read-only) |


---

## Зависимости модулей

```
Router
  ├── ask/code (вопросы)
  ├── planning/* (research/decomposition)
  ├── build/* (код)
  │   └── subagents/* (context-scout, tester, reviewer)
  └── orchestrator/workflow-builder (сложные задачи)

```

---

## Паттерны кодирования

Смотри:
- `context/core/standards/code.md` — стандарты кода
- `context/core/standards/tests.md` — стандарты тестов
- `context/core/essential-patterns.md` — базовые паттерны

---

## Как обновлять этот файл

1. При добавлении нового модуля — добавь в "Структура директорий"
2. При добавлении агента — добавь в таблицу агентов
3. При изменении зависимостей — обнови диаграмму

---

*Последнее обновление: 2026-01-19*
