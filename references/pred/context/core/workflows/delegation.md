# Delegation Workflow

> Context: workflows/delegation | Priority: high

## Quick Reference

Source of truth: `opencode.json`.
If this file and `opencode.json` diverge on `subagent_type`, follow `opencode.json` and update this file.

Process: Analyze → Delegate → Monitor → Return

---

## When to Delegate

| Condition | Delegate to (subagent_type) |
|-----------|---------------------------|
| Any code (write/edit/fix) | subagents/code/coder-agent |
| 4+ files | planning/decomposition first |
| Complex code | subagents/code/coder-agent |
| Tests | subagents/code/tester |
| Review | subagents/code/reviewer |
| Context search | subagents/core/contextscout |
| Build errors | subagents/core/debugger (required: `skill/tools/incident-response.md` for production incidents) |
| Documentation (README, API) | subagents/core/docwriter |

---

## Mode -> Delegation Map

| Mode | Context Scout | Primary route | Follow-up |
|------|---------------|---------------|-----------|
| implement-feature | AUTO (4+ files) / SKIP (1-3) | subagents/code/coder-agent | planning/decomposition first if 10+ files |
| fix-production-bug | OPTIONAL | subagents/core/debugger (required: `skill/tools/incident-response.md`) | subagents/code/tester if fix touches behavior |
| add-tests-for-module | OPTIONAL | subagents/code/tester | subagents/code/reviewer optional |
| refactor-safely | AUTO | subagents/code/coder-agent | subagents/code/reviewer then subagents/code/tester |
| write-and-sync-docs | OPTIONAL | subagents/core/docwriter | subagents/core/contextscout for missing context |
| prepare-release-docs | OPTIONAL | subagents/core/docwriter (required: `skill/tools/docs-sync.md` release-docs-sync profile) | sync corresponding sections in `PROJECT_GUIDE.md` |
| modern-design | AUTO | subagents/core/contextscout -> subagents/research/externalscout -> subagents/code/coder-agent | emit Design Decision Lock first, then implement |
| modern-backend-upgrade | AUTO | subagents/core/contextscout -> subagents/research/externalscout -> subagents/code/coder-agent -> subagents/code/tester | emit Backend Upgrade Decision Lock first, then implement |
| api-change-safe | AUTO | subagents/code/coder-agent (required: `skill/tools/api-change-safe.md`) | subagents/code/tester then subagents/core/docwriter |

Rules:
1. Detect mode before generic condition routing (including `api-change-safe`, `prepare-release-docs`, `modern-design`, `modern-backend-upgrade`).
2. If mode conflicts with generic route, mode wins.
3. One-shot execution is opt-in only (`one-shot: on`, `/oneshot`, `сделай под ключ`).
4. Without explicit one-shot trigger, stay in normal mode routing.
5. If `subagents/core/contextscout` reports `Conflict Detected` (code vs docs), use code/tests as behavior source and schedule docs sync follow-up (`write-and-sync-docs` or `prepare-release-docs`).

---

## Delegation Syntax

```
task(
  subagent_type="subagents/code/coder-agent",
  description="Brief description",
  prompt="Detailed instructions...
  
  После завершения ВЕРНИ результат вызывающему агенту."
)
```

---

## Critical Rules

1. **ALWAYS** include return instruction in prompt
2. **NEVER** delegate without context
3. **STOP** after 3 failed attempts
4. **SHOW** routing block before delegation:
   ```
   Routing: [task type]
   Agent: [subagent_type]
   Reason: [why this agent]
   ```

---

## Valid Subagent Types

| Agent | subagent_type |
|-------|---------------|
| Context Scout | subagents/core/contextscout |
| Coder | subagents/code/coder-agent |
| Debugger | subagents/core/debugger |
| Tester | subagents/code/tester |
| Reviewer | subagents/code/reviewer |
| Decomposition | planning/decomposition |
| External Scout | subagents/research/externalscout |
| DocWriter | subagents/core/docwriter |
