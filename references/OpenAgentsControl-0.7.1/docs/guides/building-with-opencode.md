# Building with OpenCode: The Power User Formula

## Overview

This guide teaches you how to build efficient, scalable OpenCode systems using the 4-layer architecture. Master this formula to create powerful AI workflows with minimal token usage and maximum reusability.

## The 4-Layer Architecture

```
Layer 1: TOOLS        → Atomic operations (read, test, lint)
Layer 2: SUBAGENTS    → Specialized skills (security, testing, refactoring)
Layer 3: COMMANDS     → User shortcuts + templates (slash commands)
Layer 4: MAIN AGENTS  → Orchestration (build, plan, general)
```

Each layer serves a specific purpose and builds upon the previous one.

---

## Layer 1: TOOLS - Build for Efficiency

### The Rule
Create tools for **frequent, verbose operations** that need output filtering or caching.

### Structure
```typescript
// .opencode/tool/[operation].ts
export default tool({
  description: "One-line: what it does, when to use",
  args: { /* minimal params */ },
  async execute(args, ctx) {
    // Run operation
    // Parse output
    // Return only what matters
    return conciseResult
  }
})
```

### When to Build a Tool
- ✅ Used 10+ times per session
- ✅ Raw output >1KB, useful info <200 chars
- ✅ Needs parsing/filtering/caching

### Examples
- `test-runner` - Run tests, return pass/fail + errors only
- `lint-check` - Return only errors in changed files
- `build-check` - Return warnings/errors, not full logs

### Quick Start: Your First Tool
```bash
# Create your first efficient tool
mkdir -p .opencode/tool
cat > .opencode/tool/test.ts << 'EOF'
import { tool } from "@opencode-ai/plugin"
import { z } from "zod"

export default tool({
  description: "Run tests, return summary or failures only",
  args: { path: z.string() },
  async execute(args, ctx) {
    const result = await ctx.$`npm test -- ${args.path}`.nothrow()
    const output = await new Response(result.stdout).text()
    return result.exitCode === 0 
      ? `✅ Tests passed`
      : `❌ Failed:\n${output.split('\n').filter(l => l.includes('FAIL') || l.includes('●')).slice(0, 20).join('\n')}`
  }
})
EOF

# Test it
opencode tui
# Type: "run the tests"
```

---

## Layer 2: SUBAGENTS - Build for Specialization

### The Rule
Create subagents for **complex, reusable workflows** that require domain expertise.

### Structure
```markdown
# .opencode/agent/[domain]/[specialist].md
---
mode: "subagent"
description: "Use WHEN/AFTER [trigger condition]"
tools:
  [essential-tool]: true
  task: false  # Prevent recursion
---

You are [role]. You specialize in:
1. [Specific capability]
2. [Specific capability]

Always [output format/requirement].
```

### When to Build a Subagent
- ✅ Multi-step process (3+ steps)
- ✅ Requires domain expertise
- ✅ Called by main agent OR user
- ✅ Isolated context beneficial

### Recommended Folder Structure
```
.opencode/agent/
├── security/
│   ├── code-scanner.md      # Vulnerability detection
│   ├── dependency-audit.md  # Supply chain check
│   └── secrets-detector.md  # Credential scanning
├── testing/
│   ├── unit-generator.md    # Generate unit tests
│   ├── e2e-builder.md       # E2E test creation
│   └── test-fixer.md        # Fix failing tests
└── refactor/
    ├── modernizer.md        # Update legacy code
    ├── optimizer.md         # Performance improvements
    └── simplifier.md        # Reduce complexity
```

### Example: Security Scanner Subagent
```markdown
# .opencode/agent/security/code-scanner.md
---
mode: "subagent"
description: "Use AFTER writing auth code to scan for vulnerabilities"
tools:
  lint-check: true
  test-runner: true
  task: false
---

You are a Security Specialist. You scan code for:
1. SQL injection vulnerabilities
2. XSS attack vectors
3. Authentication/authorization flaws
4. Insecure dependencies

Always return a structured report with severity levels.
```

---

## Layer 3: COMMANDS - Build for Convenience

### The Rule
Create commands for **common user workflows** that benefit from templates and context.

### Structure
```markdown
# .opencode/command/[workflow]/[action].md
---
description: "What this does"
agent: "[subagent-name]"  # Routes to subagent
---

[Detailed prompt with context]
@$1              # File references
@AGENTS.md       # Project standards
Additional: $2
```

### When to Build a Command
- ✅ User types it frequently
- ✅ Needs specific context files
- ✅ Benefits from template
- ✅ Can reuse subagent

### The Formula
```
Command = Subagent + Context Files + Template
```

### Examples
```bash
/security/scan file.ts           # → security/code-scanner + project files
/test/generate service.ts        # → testing/unit-generator + test patterns
/refactor/modernize legacy.js    # → refactor/modernizer + standards
```

### Example: Security Audit Command
```markdown
# .opencode/command/security/audit.md
---
description: "Run comprehensive security audit on file"
agent: "security/auditor"
---

Run a full security audit on @$1

Include:
- Vulnerability scanning
- Dependency checks
- Secret detection
- Best practice validation

Reference project standards: @AGENTS.md
```

---

## Layer 4: MAIN AGENTS - Configure, Don't Create

### The Rule
**Customize builtin agents, rarely create new primary agents.**

### Structure
```markdown
# .opencode/agent/build.md  (override built-in)
---
mode: "primary"
tools:
  test-runner: true
  lint-check: true
---

## Testing Protocol
After code changes: use test-runner
On failure: analyze and fix
On complex failure: use Task(subagent_type="testing/test-fixer")

## Quality Checks
Before completing: lint-check
If issues: fix automatically
```

### When to Create a New Primary Agent
- ❌ Almost never - customize `build`, `plan`, `general` instead
- ✅ Only for distinct modes (e.g., "code-review-only" mode)

---

## Complete Patterns

### Pattern 1: Progressive Enhancement
```
User Request
    ↓
Main Agent (build) - uses tools for atomic ops
    ↓ (if complex)
Task Tool → Subagent - specialized workflow
    ↓ (if needs helpers)
Task Tool → More Subagents - parallel execution
    ↓
Return to Main Agent
    ↓
User Response
```

### Pattern 2: User Shortcuts
```
User: /security/full-audit auth.ts
    ↓
Command loads template + context files
    ↓
Routes to subagent (mode: "subagent")
    ↓
Subagent uses tools (test-runner, lint-check)
    ↓
Returns focused report
```

---

## Real-World Example: Complete Setup

### Tools (Efficiency)
```
.opencode/tool/
├── test.ts          # Smart test runner
├── lint.ts          # Filtered linter
└── deps.ts          # Dependency checker
```

### Subagents (Specialization)
```
.opencode/agent/
├── security/
│   └── auditor.md           # Comprehensive security
├── testing/
│   ├── generator.md         # Generate tests
│   └── fixer.md             # Fix failures
└── code-review/
    └── reviewer.md          # Code quality
```

### Commands (Convenience)
```
.opencode/command/
├── check.md                 # Quick health check
├── security/
│   └── audit.md            # Full security audit
└── test/
    ├── generate.md         # Generate tests
    └── fix.md              # Fix failing tests
```

### Main Agent (Orchestration)
```
.opencode/agent/
└── build.md                # Customized build agent
```

---

## Decision Tree

### "Should I build X?"

#### TOOL?
```
Is it called 10+ times/session? → YES
Does it need output filtering? → YES
Can bash do it well enough? → NO if frequently used
```

#### SUBAGENT?
```
Is it 3+ step workflow? → YES
Does it need isolated context? → YES
Is it single atomic operation? → NO (make it a tool)
```

#### COMMAND?
```
Do users type this often? → YES
Can it reuse existing subagent? → YES (just template it)
Needs new capability? → NO (build subagent first)
```

#### MAIN AGENT?
```
Do you need a new mode? → Probably NO (customize existing)
```

---

## The Winning Configuration

### Minimal but Powerful
```
.opencode/
├── tool/
│   └── test.ts              # 1 efficient test tool
├── agent/
│   ├── build.md             # Customized with tool usage
│   └── code-review/
│       └── reviewer.md      # 1 specialized subagent
└── command/
    └── review.md            # 1 user shortcut
```

**This gives you:**
- ✅ Efficient testing (90% token savings)
- ✅ Code review capability
- ✅ User convenience
- ✅ Easy to maintain

### Scale Up as Needed
```
.opencode/
├── tool/              [2-5 tools max]
│   ├── test.ts
│   ├── lint.ts
│   └── build.ts
├── agent/            [5-15 subagents organized by domain]
│   ├── security/
│   ├── testing/
│   ├── refactor/
│   └── documentation/
└── command/          [10-20 shortcuts]
    ├── security/
    ├── test/
    └── refactor/
```

---

## Pro Tips

### 1. Start Small, Grow Organically
```
Week 1: Add test-runner tool
Week 2: Add code-review subagent
Week 3: Add shortcuts you use 3+ times
```

### 2. Make Subagents Discoverable
```markdown
description: "Use AFTER writing auth code to scan for vulnerabilities"
```
Main agent sees this in Task tool and knows when to call it.

### 3. Template Everything
```markdown
# Command template
@AGENTS.md        # Always include standards
@.cursorrules     # Always include rules
@$1               # Target file
```

### 4. Think in Layers
- **Tools** = Efficiency
- **Subagents** = Specialization
- **Commands** = Convenience
- **Main Agents** = Orchestration

### 5. Avoid Redundancy
```
❌ Separate tool + subagent doing same thing
✅ Tool for efficiency, subagent calls tool + adds intelligence
```

---

## The Formula in One Diagram

```
┌─────────────────────────────────────────┐
│  USER                                    │
│  /security/audit auth.ts                 │
└──────────────┬──────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│  COMMAND (Template + Context)            │
│  • Loads audit template                  │
│  • Attaches @auth.ts, @AGENTS.md         │
│  • Routes to: security/auditor           │
└──────────────┬───────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│  SUBAGENT (Specialized Workflow)         │
│  • Calls lint-check tool                 │
│  • Calls test-runner tool                │
│  • Analyzes with domain expertise        │
│  • Returns focused report                │
└──────────────┬───────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────┐
│  TOOLS (Efficient Operations)            │
│  • lint-check: 30K chars → 200 chars     │
│  • test-runner: 15K chars → 50 chars     │
│  • Total context: 250 chars vs 45K       │
└──────────────────────────────────────────┘
```

**Result:** 99% token savings, specialized analysis, user convenience.

---

## Getting Started

### Step 1: Create Your First Tool
```bash
mkdir -p .opencode/tool
cat > .opencode/tool/test.ts << 'EOF'
import { tool } from "@opencode-ai/plugin"
import { z } from "zod"

export default tool({
  description: "Run tests, return summary or failures only",
  args: { path: z.string() },
  async execute(args, ctx) {
    const result = await ctx.$`npm test -- ${args.path}`.nothrow()
    const output = await new Response(result.stdout).text()
    return result.exitCode === 0 
      ? `✅ Tests passed`
      : `❌ Failed:\n${output.split('\n').filter(l => l.includes('FAIL') || l.includes('●')).slice(0, 20).join('\n')}`
  }
})
EOF
```

### Step 2: Test It
```bash
opencode tui
# Type: "run the tests"
# Agent will use your new tool
```

### Step 3: Add More Layers
Once your tool works, add:
1. A subagent that uses the tool
2. A command that routes to the subagent
3. Customize your main agent to use both

---

## Summary

The Power User Formula is simple:

1. **Tools** for efficiency (90% token savings)
2. **Subagents** for specialization (domain expertise)
3. **Commands** for convenience (user shortcuts)
4. **Main Agents** for orchestration (customize, don't create)

Start with one tool, grow organically, and always think in layers.

**That's the formula.** Now go build something powerful.

---

## Related Documentation

- [System Builder Guide](../features/system-builder/guide.md)
- [Quick Start](../features/system-builder/quick-start.md)
- [Agent System Blueprint](../features/agent-system-blueprint.md)
- [Contributing Guide](../contributing/CONTRIBUTING.md)
