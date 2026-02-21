# OpenCode Global Instructions

## Environment (Windows + PowerShell)

- OS: Windows
- Shell: PowerShell (prefer pwsh 7+, fallback Windows PowerShell 5.1)
- Paths: Windows-style (`C:\path\to\file`), quote paths with spaces

### PowerShell Syntax
```powershell
# Environment variables
$env:NAME = "value"

# Chain commands (use ; not &&)
command1 ; command2

# Check exit code
$LASTEXITCODE

# Common equivalents
Get-ChildItem      # ls
Get-Content        # cat
Remove-Item -Recurse -Force  # rm -rf
```

---

## Anti-Hang Protocol (CRITICAL)

<anti_hang enforcement="absolute">
  1. MAX_STEPS: Соблюдай лимиты (30 для main agent, 15-25 для subagents)
  2. NO BLOCKING: Используй `question` tool вместо блокирующего ожидания
  3. SUBAGENT RETURN: При делегации ВСЕГДА добавляй:
     "После завершения ВЕРНИ результат и управление вызывающему агенту."
  4. TIMEOUT: Если задача затягивается — сообщи статус
  5. FAIL FAST: После 3 неудачных попыток → STOP и сообщи
</anti_hang>

---

## Smart Problem Solving (Safety Net)

<smart_problem_solving>
  При получении ошибки ОБЯЗАТЕЛЬНО:
  
  1. ПРОЧИТАЙ сообщение об ошибке
  2. Определи тип:
  
  <if condition="МОЯ ошибка">
    Признаки: "syntax error", "not found", "typo"
    Действие: Исправь свою команду. НЕ меняй инструмент.
  </if>
  
  <if condition="ПРОСТАЯ ПРИЧИНА">
    Признаки: "port in use", "permission denied"
    Действие: Устрани причину напрямую.
  </if>
  
  <if condition="ПРОБЛЕМА ИНСТРУМЕНТА">
    Признаки: "internal error", "unexpected"
    Действие: Попробуй альтернативный инструмент.
  </if>
  
  ЗАПРЕЩЕНО: прыгать на альтернативу БЕЗ анализа ошибки.
</smart_problem_solving>

---

## Context7 Integration (MANDATORY for external libs)

<context7_rule>
  Для ЛЮБОЙ внешней библиотеки (React, Next.js, FastAPI, etc.):
  
  1. НЕ угадывай API по памяти
  2. Используй Context7:
     ```
     context7_resolve_library_id(library="next.js")
     context7_get_library_docs(id="vercel/next.js", topic="server actions")
     ```
  3. См. полный скилл: `skill/tools/context7.md`
</context7_rule>

---

## Agent Architecture (v3.0)

### Structure
```
.opencode/
└── agent/
    ├── core/
    │   └── openagent.md                 # Главный агент (default_agent)
    ├── subagents/
    │   ├── code/
    │   │   ├── coder-agent.md           # Реализация кода
    │   │   ├── tester.md                # Тесты
    │   │   └── reviewer.md              # Review (read-only)
    │   ├── core/
    │   │   ├── contextscout.md          # Поиск контекста
    │   │   ├── debugger.md              # Диагностика/исправление
    │   │   └── docwriter.md             # Документация
    │   └── research/
    │       └── externalscout.md         # Внешняя документация
    └── planning/
        └── decomposition.md             # Декомпозиция задач
```

### Source Of Truth

- Runtime agent IDs, paths, and tool permissions: `opencode.json`
- Runtime behavior prompts: `.opencode/agent/**/*.md`
- Runtime context system: `context/**/*.md`
- `registry.json` is metadata inventory, not execution truth.
- Canonical docs entrypoint: `PROJECT_GUIDE.md`.

Rule: if any doc conflicts with `opencode.json`, treat `opencode.json` as canonical.

### Delegation Flow
```
User -> core/openagent -> [delegate when needed]
                            |
                            +-> subagents/core/contextscout
                            +-> subagents/code/coder-agent
                            +-> subagents/core/debugger
                            +-> subagents/code/tester
                            +-> subagents/code/reviewer
                            +-> planning/decomposition
                            +-> subagents/research/externalscout
                            +-> subagents/core/docwriter
```

---

## Skills System

### Language Skills (`skill/languages/`)
- `csharp.md` — .NET, EF Core, WPF, async
- `typescript.md` — React, Vue, Next.js
- `python.md` — FastAPI, SQLAlchemy, pytest

### Tool Skills (`skill/tools/`)
- `context7.md` — Интеграция с Context7
  - Profile: `modern-design-research` для запросов на современный UI/дизайн
- `git.md` — Conventional commits, branching
- `docs-sync.md` — Синхронизация документации и соответствующих секций в PROJECT_GUIDE
- `incident-response.md` — Triage/containment/rollback/fix для продовых инцидентов
- `api-change-safe.md` — Безопасные API-изменения (compatibility/versioning/migration)

## Skill Activation Matrix

| Trigger | Skill | Required | Owner |
|---------|-------|----------|-------|
| Any write/edit code task | `skill/languages/{language}.md` | Yes | OpenAgent -> coder-agent |
| API contract/schema change | `skill/tools/api-change-safe.md` | Yes | OpenAgent -> coder-agent/tester/docwriter |
| External library/framework/API | `skill/tools/context7.md` | Yes | OpenAgent / externalscout |
| Modern design / UI modernization request | `skill/tools/context7.md` (modern-design-research profile) | Yes | OpenAgent -> externalscout -> coder-agent |
| Modern backend stack upgrade request | `skill/tools/context7.md` (modern-backend-research profile) | Yes | OpenAgent -> contextscout -> externalscout -> coder-agent -> tester |
| Git workflow (commit/changelog/release notes) | `skill/tools/git.md` (quality commit/PR protocol) | If task touches git history | OpenAgent |
| Test authoring | `skill/languages/{language}.md` + testing conventions from context | Yes | tester |
| Debug/build fix | language skill for target file type + `skill/tools/incident-response.md` | Yes | debugger |
| Documentation synchronization | `skill/tools/docs-sync.md` | Yes for docs-sync tasks | OpenAgent / docwriter |
| Release preparation / pre-tag sync | `skill/tools/docs-sync.md` (release-docs-sync profile) | Yes | OpenAgent / docwriter |

Rules:
1. OpenAgent chooses skill set before delegation and passes it in prompt.
2. Subagent must explicitly confirm loaded skills in first response line.
3. If required skill is missing, stop and report missing prerequisite.

---

## Token Economy

| Complexity | Variant | Use For |
|------------|---------|---------|
| Trivial | `minimal` | Yes/no, simple lookups |
| Low | `low` | Code search, docs |
| Medium | `medium` | Code generation |
| High | `high` | Complex reasoning |

Правило: Начинай с низких → повышай если надо.

---

## Language Matching

Всегда отвечай на языке пользователя:
- Detect language from user's message
- All responses in that language

---

## Human-Quality Standard

Goal: produce senior-level results that are clear, precise, and grounded in project facts.

Required writing behavior:
- Explain decisions with concrete project context, not generic phrases.
- Prefer concise, direct language; remove repetitive filler.
- State trade-offs explicitly when multiple options exist.
- Keep terminology stable across code, tests, and docs.

Required coding behavior:
- Favor minimal, high-signal changes over broad rewrites.
- Use readable names and clear boundaries (input/validation/errors/side-effects).
- Avoid over-engineering and hidden magic.
- Validate correctness with relevant checks before final output.

Final self-check before response:
1. Is this actionable on first read?
2. Is the rationale specific to this repo/task?
3. Is code/test/docs behavior consistent?
4. Are risks and limits called out clearly?

## Workflow Standards

### Before Any Code
1. Before changing `opencode.json`, `.opencode/agent/**/*.md`, or `context/**/*.md` run `npm run validate:runtime`.
2. `pwd` — Verify directory
3. Load context (`context/`)
4. Load skill (`skill/languages/`)
5. For external libs -> Context7
6. Research existing patterns

### During Execution
- Согласование: 4+ файлов → подтверждение
- Инкрементально: один шаг за раз
- Stop on Error: без подтверждения не чинить
- One-shot mode: только opt-in (`one-shot: on`, `/oneshot`, `сделай под ключ`); по умолчанию OFF

### After Completion
1. If behavior/policy/approach changed -> update corresponding sections in `PROJECT_GUIDE.md`
2. Ensure code/tests/docs remain consistent after changes
3. Brief summary
4. Suggest next steps
5. If one-shot was used -> return clear end-to-end result blocks (plan/execution/validation/docs-sync)

---

## Unified Delegation Contract

Every `task(...)` delegation must contain 4 mandatory blocks:

1. `Input`
   - Scope/files
   - Context loaded
   - Constraints
2. `Expected Output`
   - What artifacts must be returned
3. `Done Criteria`
   - Objective checks that mark task complete
4. `Return Format`
   - Exact response structure back to caller

Contract rules:
- No contract -> do not delegate.
- If input is incomplete -> report missing info and stop.
- Subagent must return control phrase at the end.

---

## Never Do

- Hardcode secrets/credentials
- SQL string concatenation
- Trust unvalidated input
- Use `any` in TypeScript
- Skip error handling
- Прыгать на альтернативу без анализа ошибки

## Always Do

- Parameterized queries
- Input validation
- Environment variables for secrets
- Async/await for I/O
- Context7 для внешних библиотек
- Match user's language
