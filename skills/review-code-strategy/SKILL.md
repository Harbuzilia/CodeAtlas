---
name: review-code-strategy
description: "Стратегия код-ревью: скоуп и risk profile, порядок security → correctness → reliability → maintainability → performance, факты отдельно от предположений, вердикт approve/request-changes/block"
---

# Review Code Strategy Skill

Use as baseline for reviewer startup.

## Strategy
1. Define scope and risk profile first.
2. Review in this order: security -> correctness -> reliability -> maintainability -> performance.
3. Separate confirmed facts from assumptions.
4. Report each finding with severity, impact, and minimal fix guidance.

## Output Standard
- Critical/high issues first
- Clear approve/request-changes/block recommendation
- No speculative claims without evidence
