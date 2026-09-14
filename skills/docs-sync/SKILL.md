---
name: docs-sync
description: docs-sync skill reference
---

# Docs Sync Skill

> Purpose: keep project documentation consistent after functional/runtime changes.

## When to use
- Updating README and runtime docs for the same feature
- Syncing API/docs/CI expectations in one pass
- Cleaning contradictory statements across docs

## Required inputs
- Scope of changed functionality
- Canonical source files (runtime SoT)
- Target docs to update

## Docs sync checklist
1. Identify canonical truth first:
   - `opencode.json`
   - `agents/**/*.md`
   - `context/**/*.md`
2. Update user-facing docs (`README.md`, `PROJECT_GUIDE.md`) with same wording for behavior-critical parts.
3. Sync process sections in `PROJECT_GUIDE.md` for policy/behavior changes.
4. Verify links and paths after edits.
5. Keep legacy docs historical; do not use them as runtime truth.

## Release-docs-sync profile
Use this profile when task intent includes release/tag/cutoff/pre-release.

Release-docs-sync checklist:
1. Sync runtime behavior notes in `PROJECT_GUIDE.md`.
2. Add release-facing change notes in `PROJECT_GUIDE.md` (Change Log section).
3. Update decision notes in `PROJECT_GUIDE.md` if policy/approach changed.
4. Ensure wording across these files is non-contradictory.

## Return format
- Docs changed
- What was synchronized
- Any unresolved inconsistencies
- Final phrase: "Работа завершена. Возвращаю управление."
