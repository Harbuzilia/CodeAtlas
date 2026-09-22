# Core Context Navigation

## Purpose
Navigation for core standards and workflows.

---

## Quick Routes

| Intent | File | Priority |
|--------|------|----------|
| Code standards | `standards/code.md` | Critical |
| Test standards | `standards/tests.md` | Critical |
| Doc standards | `standards/docs.md` | High |
| Essential patterns | `essential-patterns.md` | High |
| Code review | `workflows/review.md` | Critical for reviews |
| Delegation | `workflows/delegation.md` | Critical for handoffs |
| Resilience | `workflows/resilience.md` | High for recovery |
| Swarm coordination | `workflows/swarm-protocol.md` | High for parallel work |
| Path conventions | `config/paths.json` | Reference |

---

## Standards Directory

### `standards/code.md`
- When: Any code writing/editing
- Contains: SOLID, async patterns, error handling, language-specific (C#, Python, TS)

### `standards/tests.md`
- When: Writing tests, TDD
- Contains: AAA pattern, positive/negative, mocking, frameworks

### `standards/docs.md`
- When: Documentation, README
- Contains: Templates, comment standards, API docs format

---

## Workflows Directory

### `workflows/review.md`
- When: Code review
- Contains: Checklist, Conventional Comments, severity levels

### `workflows/delegation.md`
- When: Delegating to subagents
- Contains: Context bundling, handoff format

### `workflows/resilience.md`
- When: Recovering from failed runs, drift, degraded state
- Contains: Recovery paths, rollback rules

### `workflows/swarm-protocol.md`
- When: Coordinating multiple agents in parallel
- Contains: Swarm roles, sync rules

---

## Config Directory

### `config/paths.json`
- When: Resolving repo path conventions
- Contains: Canonical location of standards, workflows, docs, history

---

## Essential Patterns

### `essential-patterns.md`
- When: General code tasks
- Contains: Pure functions, error handling, security basics
