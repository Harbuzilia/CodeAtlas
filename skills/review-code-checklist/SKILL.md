---
name: review-code-checklist
description: "Чеклист код-ревью по категориям: security, correctness, reliability, maintainability, performance, покрытие тестами; каждое issue с файлом, severity и минимальным фиксом"
---

# Review Code Checklist Skill

Use alongside `review-code-strategy`.

## Checklist
- Security: injection, secrets, auth/session, sensitive logging
- Correctness: edge cases, null/empty handling, error flow
- Reliability: retries/timeouts, resource cleanup, race conditions
- Maintainability: naming, cohesion, duplication, complexity
- Performance: N+1 patterns, expensive loops, unnecessary allocations
- Tests/docs: behavior changes covered and documented

## Reporting
For every issue include: file path, severity, problem, why it matters, minimal fix.
