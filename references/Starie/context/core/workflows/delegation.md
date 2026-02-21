# Delegation Workflow

> Context: workflows/delegation | Priority: high

## Quick Reference

**Process**: Create context → Populate → Delegate → Cleanup

**Location**: `.tmp/sessions/{timestamp}-{task-slug}/context.md`

---

## Template Structure

```markdown
# Task Context: {Task Name}

Session ID: {id}
Created: {timestamp}
Status: in_progress

## Current Request
{Что пользователь запросил}

## Requirements
- {requirement 1}
- {requirement 2}

## Decisions Made
- {decision 1 - approach/constraints}
- {decision 2}

## Files to Modify/Create
- {file 1} - {purpose}
- {file 2} - {purpose}

## Static Context
- context/core/standards/code.md (for code quality)
- context/core/standards/tests.md (for test requirements)
- Other relevant context files

## Constraints/Notes
{Important context, preferences, compatibility}

## Progress
- [ ] {task 1}
- [ ] {task 2}

---
**Instructions for Subagent:**
{Specific instructions on what to do}
```

---

## Delegation Process

### Step 1: Create temporary context
- Location: `.tmp/sessions/{timestamp}-{task-slug}/context.md`
- Use template above

### Step 2: Populate context file
- Fill in all sections with relevant details
- Reference static context files (don't duplicate content)

### Step 3: Delegate with context path
```
Task: {brief description}
Context: .tmp/sessions/{id}/context.md

Read the context file for full details.
Reference static context files as needed.
```

### Step 4: Cleanup after completion
- Ask user: "Task complete. Clean up session files?"
- If approved: Delete session directory

---

## When to Delegate

| Condition | Delegate to |
|-----------|-------------|
| 4+ files | planning/decomposition |

| Complex code | core/opencoder |
| Tests | subagents/tester |
| Review | subagents/reviewer |
| Context search | subagents/context-scout |
