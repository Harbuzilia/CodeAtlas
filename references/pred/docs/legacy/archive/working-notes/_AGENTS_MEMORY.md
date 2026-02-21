# PROJECT MEMORY & ARCHITECTURE

## 🚀 Current Goal
- [x] Deep analysis of reference projects (OAC, AssistAgents)
- [x] Restore 9 agents from legacy backup
- [x] Implement anti-hang protocol
- [x] Add TDD mode to coder
- [x] Update opencode.json

## 🛠 Tech Stack
- **Framework**: OpenCode
- **Model**: Gemini 3 Pro (Antigravity)
- **Agents**: 9 custom agents (core, specialist, planning, research)
- **MCP**: context7, memory, filesystem, chrome-devtools

## 🧠 Context & Decisions

### 2026-02-01: Elite Architecture Implementation
- Merged best patterns from OAC (660-line openagent) and AssistAgents (flat structure)
- Kept legacy context-scout (796 lines) — superior to OAC's 193 lines
- Added Anti-Hang Protocol: max_steps, question tool, RETURN instructions
- Added TDD Protocol to coder: RED-GREEN-REFACTOR

### Anti-Hang Root Cause
- Old system hung because:
  1. Subagents had no max_steps
  2. approval_gate blocked without timeout
  3. No explicit RETURN mechanism
- Fixed via: max_steps (15-30), question tool, explicit return instructions

## ⚠️ Known Issues / Tech Debt
- `env` property warning in opencode.json (MCP memory config) — not critical
- Legacy backup still in `_legacy_v3_backup/` — can be cleaned up later

## 📦 Recent Changes Log
- 2026-02-01: Created `agent/core/openagent.md` (10KB, anti-hang, question tool)
- 2026-02-01: Created `agent/core/orchestrator.md` (1KB, thin wrapper)
- 2026-02-01: Restored `agent/specialist/context-scout.md` (26KB, 5-stage workflow)
- 2026-02-01: Restored `agent/specialist/debugger.md` (11.6KB, 3-attempt limit)
- 2026-02-01: Created `agent/specialist/coder.md` (7.8KB, TDD mode)
- 2026-02-01: Restored `agent/specialist/reviewer.md`, `tester.md`
- 2026-02-01: Restored `agent/planning/planner.md`, `agent/research/external-scout.md`
- 2026-02-01: Updated `opencode.json` with all 9 agents, default_agent = openagent
- 2026-02-01: Added Smart Problem Solving protocol to openagent.md and coder.md
- 2026-02-01: Created elite skills: `skill/languages/csharp.md`, `typescript.md`, `python.md`
- 2026-02-01: Created `skill/tools/context7.md`, `git.md`
- 2026-02-01: Added `ddg-search` and `github-grep` MCP
- 2026-02-01: Updated `instructions.md`, `ARCHITECTURE.md`, `SYSTEM_GUIDE.md` for v2.0
- 2026-02-01: Removed obsolete `AGENTS.md`
