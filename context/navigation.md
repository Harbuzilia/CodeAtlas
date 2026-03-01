# Context Navigation

## Purpose
Entry point for context discovery.

Path governance:
- Resolve context root from `core/config/paths.json` (`paths.local`, fallback `context`).
- ContextScout should read paths config first, then `<context_root>/navigation.md`.

---

## Quick Routes

| Intent | Files |
|--------|-------|
| Writing code | `core/standards/code.md` |
| Writing tests | `core/standards/tests.md` |
| Writing docs | `core/standards/docs.md` |
| Code review | `core/workflows/review.md` |
| Delegation | `core/workflows/delegation.md` |
| Project patterns | `project/patterns.md` |

---

## Directory Structure

```
<context_root>/
├── navigation.md           ← YOU ARE HERE
├── index.md               ← Detailed index
├── core/
│   ├── navigation.md      ← Core domain map
│   ├── essential-patterns.md
│   ├── standards/
│   │   ├── code.md
│   │   ├── tests.md
│   │   └── docs.md
│   └── workflows/
│       ├── delegation.md
│       └── review.md
└── project/
    ├── navigation.md      ← Project domain map
    └── patterns.md

Config:
- `core/config/paths.json`
```

---

## Loading Strategy

### For Code Tasks
1. Critical: `core/standards/code.md`
2. High: `core/essential-patterns.md`
3. Medium: `project/patterns.md`

### For Test Tasks
1. Critical: `core/standards/tests.md`
2. High: `core/standards/code.md`

### For Review Tasks
1. Critical: `core/workflows/review.md`
2. High: `core/standards/code.md`

---

## External Libraries

If user mentions a library/framework NOT covered here:
→ Recommend `subagents/research/externalscout`

See `skills/context7/SKILL.md` for supported libraries and usage rules.
