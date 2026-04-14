---
name: incident-response
description: incident-response skill reference
---

# Incident Response Skill

> Purpose: handle runtime/production incidents with fast, safe, and auditable recovery.

## When to use
- Production bug impacting users
- Intermittent runtime failures after deploy/reload
- Build/runtime regressions requiring triage and rollback decision

## Required inputs
- Incident symptom (error, endpoint, metric, alert)
- Scope and affected components
- Current constraints (allowed changes, downtime tolerance)

## Incident workflow
1. Triage
   - Confirm impact (who/what is broken)
   - Confirm severity (critical/high/medium)
   - Capture first evidence (error signatures, timestamps)
2. Containment
   - Stop spread/escalation (feature flag, isolate failing path)
   - Decide if rollback is needed now
3. Root cause investigation
   - Reproduce with minimal scope
   - Identify exact trigger and failure path
   - Validate assumptions with logs/metrics
4. Fix strategy
   - Prefer smallest safe fix first
   - Keep rollback path ready
   - Avoid unrelated refactors during incident
5. Validation
   - Verify incident symptom is resolved
   - Run focused regression checks around touched behavior
6. Communication and record
   - Summarize root cause, fix, risk, follow-up actions
   - Sync corresponding change/decision sections in `PROJECT_GUIDE.md` when behavior/process changed

## Output contract
- Incident summary
- Severity and impact
- Root cause hypothesis (or confirmed cause)
- Containment/rollback decision
- Fix plan and validation steps
- Follow-up actions
- Final phrase: "Работа завершена. Возвращаю управление."
