# Delegation Workflow

> Context: workflows/delegation | Priority: high

## Quick Reference

Source of truth: `opencode.json`.
If this file and `opencode.json` diverge on agent names, follow `opencode.json` and update this file.

Process: Analyze → Delegate (serial route) → Monitor → Return

Performance contract:
- Route between agents is strictly serial.
- Safe parallelization is allowed only inside independent read-only discovery sub-steps (glob/grep/read batches).

---

## When to Delegate

| Condition | Delegate to (agent name) |
|-----------|---------------------------|
| Any code (write/edit/fix) | coder |
| 4+ files | planner first |
| Complex code | coder |
| Tests | tester |
| Review | reviewer |
| Context search | contextscout |
| Build errors | debugger (required: `incident-response` for production incidents) |
| Documentation (README, API) | docwriter |

---

## Mode -> Delegation Map

| Mode | Context Scout | Primary route | Follow-up |
|------|---------------|---------------|-----------|
| implement-feature | AUTO (4+ files) / SKIP (1-3) | coder | planner first if 4+ files |
| fix-production-bug | OPTIONAL | debugger (required: `incident-response`) | tester if fix touches behavior |
| add-tests-for-module | OPTIONAL | tester | reviewer optional |
| refactor-safely | AUTO | coder | reviewer then tester |
| write-and-sync-docs | OPTIONAL | docwriter | contextscout for missing context |
| prepare-release-docs | OPTIONAL | docwriter (required: `docs-sync` release-docs-sync profile) | sync corresponding sections in `PROJECT_GUIDE.md` |
| modern-design | AUTO | contextscout -> externalscout -> coder | emit Design Decision Lock first, then implement |
| modern-backend-upgrade | AUTO | contextscout -> externalscout -> coder -> tester | emit Backend Upgrade Decision Lock first, then implement |
| api-change-safe | AUTO | coder (required: `api-change-safe`) | tester then docwriter |

Rules:
1. Detect mode before generic condition routing (including `api-change-safe`, `prepare-release-docs`, `modern-design`, `modern-backend-upgrade`).
2. If mode conflicts with generic route, mode wins.
3. One-shot execution is opt-in only (`one-shot: on`, `/oneshot`, `сделай под ключ`).
4. Without explicit one-shot trigger, stay in normal mode routing.
5. If `contextscout` reports `Conflict Detected` (code vs docs), use code/tests as behavior source and schedule docs sync follow-up (`write-and-sync-docs` or `prepare-release-docs`).

---

## How to Delegate

Используй **Task tool** с именем нужного агента. В prompt включи:
- Input: scope, контекст, ограничения
- Expected Output: что вернуть
- Done Criteria: проверки готовности
- Return Format: Summary, Files, Validation
- Фразу: "После завершения ВЕРНИ результат."

---

## Critical Rules

1. **ALWAYS** include return instruction in prompt
2. **NEVER** delegate without context
3. **STOP** after 3 failed attempts
4. **SILENT DELEGATION**: Вызывай task() сразу как function call. НЕ выводи текст перед вызовом. Делегация видна в UI автоматически.
<!-- Routing metadata may exist internally for validators, but it is not shown to user text output. -->
5. **ATOMIC DELEGATION**: If selected route requires delegation, call task(...) in the same turn immediately.
6. **ATOMIC DELEGATION ERROR**: If delegation path is selected but task(...) is not called in the same turn, return exactly `FAILED. Возвращаю управление.`
7. **NO CONFIRM GATE BEFORE HANDOFF**: Do not ask approval/confirm/"продолжай" before Task tool call.
8. **CONTINUE AFTER RESULT**: After Task tool returns subagent result, IMMEDIATELY call task() for next agent in route. ZERO text between task() calls. Only output text as final report after ALL route steps complete.
9. **SERIAL-ROUTE**: Межагентный route всегда строго последовательный; параллельные task() для route запрещены.
10. **PARALLEL-DISCOVERY-ONLY**: Параллелизация разрешена только для независимых read-only discovery подшагов (`glob`/`grep`/`read` батчи) и не может менять route-последовательность.
11. **NO-LEAK**: ЗАПРЕЩЕНО выводить параметры task() как текст (JSON, prompt, description, subagent_type). Параметры идут ТОЛЬКО внутри function call.
12. **NO-EARLY-EXIT**: НЕ говори "Работа завершена" пока ВСЕ шаги route не выполнены и результат каждого не получен.
13. **FINAL-REPORT-ONLY**: Единственный текстовый вывод = финальный отчёт после завершения ВСЕЙ цепочки. Между делегациями — ноль текста.

---

## Valid Subagent Types

| Agent | Name (for Task tool) |
|-------|---------------|
| Context Scout | contextscout |
| Coder | coder |
| Debugger | debugger |
| Tester | tester |
| Reviewer | reviewer |
| Planner | planner |
| External Scout | externalscout |
| DocWriter | docwriter |
