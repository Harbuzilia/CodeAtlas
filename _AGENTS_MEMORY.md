# PROJECT MEMORY & ARCHITECTURE

## Current Goal
- [x] Fix delegation chain stopping after first subagent
- [x] Integrate Visual UI Tester (`uitester`) using Chrome DevTools MCP
- [x] Implement State Persistence (`.opencode/task_state.md`)
- [x] Add 3 new specific Skills (database, security, devops) and enhance C#/Python/Git
- [x] Implement Self-Healing Memory (`.opencode/lessons_learned.md`)
- [x] Fix DCP configuration to trigger compression on large context models
- [x] **Full Config Audit**: Migrate deprecated `tools:` → `permission:` in all 10 agents
- [x] **Methodological Skill Integration**: Added 12 new methodological skills (brainstorming, tdd, single-flow, etc.) to Opencode1 and integrated them with OpenAgent and runtime validator.
- [x] **Permission Ordering Bug**: Fix bash wildcard `*` placement (last-match-wins)
- [x] **MCP Optimization**: Context7 local→remote, ddg-search timeout, remove memory+filesystem MCP
- [x] **Agent Modernization**: Add `color`, `hidden:true`, `task` permissions, enhanced bash rules
- [x] **Garbage Cleanup**: Deleted redundant logs, old diffs, and the references/ folder
- [x] **Cross-Platform Installer**: Created `scripts/install.mjs` with @inquirer/prompts, deleted old bash/mjs installers

## Tech Stack (Detected)
- Language: Markdown (agent definitions), JavaScript (validation scripts)
- Runtime: OpenCode v1.1.1+
- Agents: openagent, contextscout, coder, debugger, tester, reviewer, planner, externalscout, docwriter, uitester
- Skills: csharp, typescript, python, database-sql, devops-docker, security-owasp, context7, git, docs-sync, incident-response, api-change-safe, repomap

## Context & Decisions
- Validator: `node validate-runtime-governance.mjs` — checks exact strings in agent files
- **SILENT DELEGATION**: agent calls task() directly, no text output before delegation
- **FINAL REPORT ONLY**: единственный текстовый вывод = финальный отчёт после ВСЕЙ цепочки
- **PERMISSION-BASED CONFIG**: All agents migrated from deprecated `tools:` to `permission:` (2026-04-13)
- **LAST-MATCH-WINS**: bash permissions must have `"*": "ask"` FIRST, specific rules AFTER
- **DCP > Native Compaction**: DCP plugin kept, config updated to new unified `compress` format
- **EchoVault is primary memory**: `memory` MCP removed, EchoVault retained
- **No filesystem MCP**: replaced with `external_directory` permission
- `steps: 50` for main agent (was 30, caused chain breaks due to step budget exhaustion)
- question tool policy [B2]: all agents use question tool for clarifications, never chat text
- Hidden agents: contextscout, externalscout (hidden: true — not shown in @ autocomplete)

## Known Issues / Tech Debt
- ddg-search MCP shows "Connection closed" error (external issue, timeout:30 added)
- ~~skills/repomap/SKILL.md fails validator frontmatter check~~ (FIXED: Updated regex to support Windows CRLF line endings)

## Recent Changes Log
- 2026-04-14: Clarified EchoVault's role as a long-term semantic memory alternative to standard session memory and generic memory MCPs.
- 2026-04-13: Removed `_AGENTS_MEMORY.md` from `install.mjs` install list so user projects do not copy this template's development history.
- 2026-04-13: **Methodological Skill Integration** — Migrated 12 process skills (brainstorming, tdd, single-flow, etc.) to Opencode1 `skills/` dir. Registered them in the runtime validator. Updated `openagent.md` delegation matrix to inject these skills dynamically. Updated all subagents (`coder`, `tester`, `debugger`, `planner`, `reviewer`) to explicitly load these skills via their `<startup_sequence>`. Updated `instructions.md` with methodology documentation.
- 2026-04-13: **FULL CONFIG OPTIMIZATION (17 tasks)** —
  - Migrated all 10 agents from deprecated `tools:` to `permission:` syntax
  - Fixed critical bash permission ordering bug (`*` wildcard now first)
  - Context7 MCP: local→remote (https://mcp.context7.com/mcp)
  - Removed `memory` and `filesystem` MCP servers (EchoVault retained)
  - Added `external_directory`, `doom_loop`, `skill`, `read`, `task` permissions
  - Added `color` to all agents in opencode.json
  - Added `hidden: true` to contextscout and externalscout
  - Added `task: deny` to read-only agents (reviewer, planner, contextscout, externalscout, docwriter, uitester)
  - Enhanced bash granularity: tester gets test commands, debugger gets build/run commands
  - Updated dcp.jsonc to new unified `compress` format with %-based limits
  - ddg-search: added timeout: 30 for connection stability
- 2026-04-13: **Cross-Platform Installer** — Created interactive `scripts/install.mjs` (inquirer prompts, backup, gitignore patch, post-install validation). Deleted `opencode-init.sh`, `install-local.mjs`, `update-local.mjs`. Updated `package.json` with bin entry and @inquirer/prompts dep.
- 2026-04-13: **Garbage Cleanup** — Deleted redundant files (`_SCRATCHPAD.md`, `.aider*`, old text logs) and the `references/` folder.
- 2026-03-01: **Structural Code Analysis** — Integrated `ast-index` and `repomap`
- 2026-03-01: **ContextScout Empowerment** — Allowed read-only bash tools
- 2026-02-20: **Architectural Cleanup** — Synced registry, standardized permissions
- 2026-02-20: **DCP Fixes & Skills Upgrade** — Added 3 new skills
- 2026-02-20: **Self-Healing Memory** — lessons_learned.md integration
- 2026-02-19: **SILENT DELEGATION** — routing block removed from output
- 2026-02-18: Validator passes: `Runtime governance validation passed.`
