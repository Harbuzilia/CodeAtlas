---
name: review-code-strategy
description: review-code-strategy skill reference
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
