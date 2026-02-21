# PROJECT MEMORY & ARCHITECTURE

## Current Goal
- [x] Fix delegation chain stopping after first subagent
- [x] Integrate Visual UI Tester (`uitester`) using Chrome DevTools MCP
- [x] Implement State Persistence (`.opencode/task_state.md`)
- [x] Add 3 new specific Skills (database, security, devops) and enhance C#/Python/Git
- [x] Implement Self-Healing Memory (`.opencode/lessons_learned.md`)
- [x] Fix DCP configuration to trigger compression on large context models

## Tech Stack (Detected)
- Language: Markdown (agent definitions), JavaScript (validation scripts)
- Runtime: OpenCode
- Agents: openagent, contextscout, coder, debugger, tester, reviewer, planner, externalscout, docwriter, uitester
- Skills: csharp, typescript, python, database-sql, devops-docker, security-owasp, context7, git, docs-sync, incident-response, api-change-safe

## Context & Decisions
- Validator: `node validate-runtime-governance.mjs` — checks exact strings in agent files
- **SILENT DELEGATION**: agent calls task() directly, no text output before delegation. Routing block in HTML comments for validator only.
- Delegation chain: openagent MUST continue chain without text between task() calls
- **FINAL REPORT ONLY**: единственный текстовый вывод = финальный отчёт после ВСЕЙ цепочки
- JSON leak: Task tool must be function call, never text output
- One-shot mode: opt-in only (`one-shot: on`, `/oneshot`, `сделай под ключ`)
- Skill Gate [G0]: before startup_sequence complete, only skill tool allowed
- `steps: 50` for main agent (was 30, caused chain breaks due to step budget exhaustion)
- question tool policy [B2]: all agents use question tool for clarifications, never chat text

## Known Issues / Tech Debt
- ddg-search MCP shows "Connection closed" error (external issue, not our code)

## Recent Changes Log
- 2026-02-20: **Architectural Cleanup** — Synced `registry.json` with active agents, removed legacy `.opencode/agent/` docs paths, and standardized permission globs (`**/*`) across all agent configs to align with `opencode.json`.
- 2026-02-20: **Market Best Practices (GSD)** — Integrated `[DILIGENCE]` ("MAKE NO MISTAKES") rule to `coder` and `reviewer`. Added automated Atomic Commits/Backups to `coder` (with fallback to `.opencode/history/` for non-git projects). Switched `planner` output to strict XML tags (`<task>`).
- 2026-02-20: **DCP Fixes & Skills Upgrade** — Adjusted `dcp.jsonc` limit to 150000 and nudgeFrequency to 10. Added 3 new skills (database, security, devops). Enhanced existing skills with performance rules and Conventional Commits.
- 2026-02-20: **Self-Healing Memory** — `debugger` now logs fixes to `.opencode/lessons_learned.md`, and `coder` reads it on startup.
- 2026-02-20: **Feedback Loops & State Persistence** — `openagent` auto-retries coder up to 2 times on validation failure. `planner` generates `.opencode/task_state.md` checklist for cross-session state.
- 2026-02-20: **UI Tester & DuckDuckGo** — Registered `uitester` for Chrome DevTools visual testing. `debugger` delegates to `externalscout` (DuckDuckGo Search) if first fix attempt fails.
- 2026-02-19: **Skill Loading Protocol** — added to instructions.md with fallback chain. Added `opencode-init.sh` for easy symlinking.
- 2026-02-19: **[RETURN] rule** — added to ALL 8 subagents. Guarantees every subagent always returns results — no silent hangs.
- 2026-02-19: **SILENT DELEGATION** — routing block removed from output, agent calls task() directly, text only in final report
- 2026-02-19: `steps: 30` → `steps: 50` — fixed chain breaks caused by step budget exhaustion
- 2026-02-19: Hard rules P0: [SILENT-DELEGATION][NO-LEAK][CHAIN][NO-EARLY-EXIT][BUDGET][B2]
- 2026-02-18: Upgraded all agents — hard_rules, startup_sequence, Skill Gate [G0], question tool [B2]
- 2026-02-18: Validator passes: `Runtime governance validation passed.`
