---
name: api-change-safe
description: api-change-safe skill reference
---

# API Change Safe Skill

> Purpose: apply API changes without breaking existing consumers.

## When to use
- Endpoint request/response schema changes
- Auth, headers, status code, or error format changes
- Versioning or deprecation decisions

## Required inputs
- API surface being changed (routes/contracts)
- Current consumers (internal/external)
- Backward-compat constraints

## Safety workflow
1. Contract inventory
   - List affected endpoints, methods, request/response fields, status codes.
2. Compatibility analysis
   - Classify each change: backward-compatible or breaking.
   - For breaking changes, define migration path.
3. Versioning/deprecation strategy
   - Prefer additive changes.
   - For breaking changes, define versioning and deprecation timeline.
4. Test impact
   - Identify contract tests to add/update.
   - Ensure error semantics and status codes are covered.
5. Documentation sync
   - Update runtime docs, changelog, and decisions when API behavior changes.

## Output contract
- Change summary (compatible vs breaking)
- Consumer impact
- Migration/deprecation plan
- Test and validation plan
- Docs sync checklist
- Final phrase: "Работа завершена. Возвращаю управление."
