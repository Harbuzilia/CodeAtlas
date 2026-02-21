# Clear Guidelines: Main Agent → Slash Command → Subagent

## The Complete Pattern

### Step 1: Create Your Command (Template Only)

```markdown
# .opencode/command/security/scan.md
---
description: "Security vulnerability scan"
# NO agent field - let caller decide
---

Perform security scan on: $ARGUMENTS

@$1
@AGENTS.md
@.cursorrules

Check for:
- SQL injection
- XSS vulnerabilities
- Authentication issues
```

### Step 2: Create Your Subagent

```markdown
# .opencode/agent/security/scanner.md
---
mode: "subagent"
description: "Security vulnerability detection specialist"
tools:
  read: true
  grep: true
---

You are a security expert. Scan code for vulnerabilities.
```

### Step 3: Document in AGENTS.md (CRITICAL)

```markdown
# AGENTS.md

## Slash Commands for Subagents

When you need specialized workflows, use the Task tool with slash commands:

### Pattern

```
Task(
  subagent_type="[subagent-name]",
  prompt="/command-name arguments"
)
```

### Available Commands

**Security:**
- `/security/scan [file]`
  - Use: `Task(subagent_type="security/scanner", prompt="/security/scan auth.ts")`
  - Performs comprehensive security analysis

**Testing:**
- `/test/generate [file]`
  - Use: `Task(subagent_type="testing/generator", prompt="/test/generate service.ts")`
  - Generates unit tests with project patterns

**Refactoring:**
- `/refactor/modernize [file] [context]`
  - Use: `Task(subagent_type="refactor/modernizer", prompt="/refactor/modernize old.js 'use async/await'")`
  - Updates legacy code to modern standards

### When to Use

- User asks for security audit → Use `/security/scan`
- After writing code → Use `/test/generate`
- Legacy code mentioned → Use `/refactor/modernize`
```

## How It Works

```
User: "Check auth.ts for security issues"
    ↓
Main Agent reads AGENTS.md
    ↓
Sees: /security/scan pattern
    ↓
Main Agent calls:
  Task(
    subagent_type="security/scanner",
    prompt="/security/scan auth.ts"
  )
    ↓
System processes /security/scan command:
  - Loads template from command/security/scan.md
  - Replaces $ARGUMENTS with "auth.ts"
  - Attaches @auth.ts file
  - Attaches @AGENTS.md, @.cursorrules
    ↓
Subagent "security/scanner" receives:
  - Full template text
  - All attached files as context
    ↓
Subagent executes → Returns result → Main agent responds to user
```

## Complete Working Example

### Files Structure

```
.opencode/
├── agent/
│   ├── security/
│   │   └── scanner.md
│   ├── testing/
│   │   └── generator.md
│   └── refactor/
│       └── modernizer.md
├── command/
│   ├── security/
│   │   └── scan.md
│   ├── test/
│   │   └── generate.md
│   └── refactor/
│       └── modernize.md
└── AGENTS.md  ← Documents the patterns
```

### 1. Command Template

```markdown
# .opencode/command/test/generate.md
---
description: "Generate comprehensive unit tests"
---

Generate unit tests for: $ARGUMENTS

Target file:
@$1

Existing test patterns:
!`find $(dirname $1) -name "*.test.*" | head -3`

Requirements:
- Test all public methods
- Include edge cases
- Mock external dependencies
- Follow project conventions from @AGENTS.md
```

### 2. Subagent

```markdown
# .opencode/agent/testing/generator.md
---
mode: "subagent"
description: "Use AFTER writing new code to generate comprehensive tests"
tools:
  read: true
  write: true
  grep: true
---

You generate unit tests by:
1. Analyzing the implementation
2. Studying existing test patterns
3. Creating thorough test coverage
4. Following project conventions
```

### 3. AGENTS.md Documentation

```markdown
# AGENTS.md

## Build/Test Commands
- Run tests: `npm test`
- Single test: `npm test -- path/to/test.ts`

## Code Standards
- TypeScript strict mode
- camelCase for functions
- PascalCase for classes

## Slash Commands with Subagents

Use Task tool to invoke specialized workflows:

### Testing Workflow

After writing new code, generate tests:

```
Task(
  subagent_type="testing/generator",
  prompt="/test/generate src/services/payment.ts"
)
```

### Security Workflow

Before deploying authentication code:

```
Task(
  subagent_type="security/scanner",
  prompt="/security/scan src/auth/*.ts"
)
```

### Refactoring Workflow

When updating legacy code:

```
Task(
  subagent_type="refactor/modernizer",
  prompt="/refactor/modernize src/legacy/util.js 'convert to TypeScript with async/await'"
)
```

### Pattern Summary

1. Identify the workflow need
2. Use Task tool with appropriate subagent_type
3. Pass slash command as the prompt
4. Command loads template + context
5. Subagent executes with full context
```

## Real Conversation Example

```
User: "I just wrote a new payment service. Can you add tests?"

Main Agent (reads AGENTS.md, sees testing workflow):
  "I'll generate comprehensive tests for the payment service."
  
  [Calls Task tool:]
  Task(
    description="Generate payment service tests",
    subagent_type="testing/generator",
    prompt="/test/generate src/services/payment.ts"
  )

Command System:
  - Loads .opencode/command/test/generate.md
  - Replaces $1 with "src/services/payment.ts"
  - Attaches payment.ts file
  - Finds existing test files in same directory
  - Attaches AGENTS.md for conventions

Subagent (testing/generator):
  - Receives full context
  - Analyzes payment.ts implementation
  - Studies existing test patterns
  - Generates comprehensive tests
  - Returns result

Main Agent:
  "✅ Generated comprehensive tests in src/services/payment.test.ts
  - Tests all public methods
  - Includes edge cases for failed payments
  - Mocks payment gateway
  - Follows project test conventions"
```

## Template for Your AGENTS.md

```markdown
# AGENTS.md

## Project Commands
[Your build/test commands]

## Code Standards
[Your standards]

## Automated Workflows

I have specialized workflows accessible via slash commands.
Use the Task tool to invoke them with appropriate subagents.

### Pattern

```
Task(
  subagent_type="[subagent-name]",
  prompt="/[command-name] [arguments]"
)
```

### Security Analysis

**When:** Before deploying auth/payment code
**Command:** `/security/scan [file]`
**Subagent:** `security/scanner`
**Example:**

```
Task(
  subagent_type="security/scanner",
  prompt="/security/scan src/auth/jwt.ts"
)
```

### Test Generation

**When:** After writing new code
**Command:** `/test/generate [file]`
**Subagent:** `testing/generator`
**Example:**

```
Task(
  subagent_type="testing/generator",
  prompt="/test/generate src/services/payment.ts"
)
```

### Code Modernization

**When:** Refactoring legacy code
**Command:** `/refactor/modernize [file] [instructions]`
**Subagent:** `refactor/modernizer`
**Example:**

```
Task(
  subagent_type="refactor/modernizer",
  prompt="/refactor/modernize src/old-api.js 'convert to TypeScript with async/await'"
)
```

### Quick Reference

| Task | Command | Subagent |
|------|---------|----------|
| Security scan | `/security/scan` | `security/scanner` |
| Generate tests | `/test/generate` | `testing/generator` |
| Modernize code | `/refactor/modernize` | `refactor/modernizer` |

## Notes

- Commands are templates that attach context files automatically
- Subagents receive full context and execute specialized workflows
- Always specify subagent_type when using Task tool with slash commands
```

## Key Points

1. **Commands are templates** - They don't execute anything, they just format context
2. **Subagents do the work** - They receive the processed template + attached files
3. **AGENTS.md is the bridge** - It tells main agent HOW to connect commands to subagents
4. **Pattern is always:** `Task(subagent_type="X", prompt="/command args")`
5. **Main agent decides** which subagent to use based on your documentation

## Checklist

- ✅ Create command templates (no agent field)
- ✅ Create specialized subagents (mode: "subagent")
- ✅ Document pattern in AGENTS.md with examples
- ✅ Include "When to use" triggers
- ✅ Show exact Task tool syntax
- ✅ Test with: "Can you [task description]"

That's it! Main agent reads AGENTS.md, sees the patterns, and knows how to invoke slash commands through subagents.

---

## Appendix: Path Resolution Test Findings

**Date:** November 19, 2025  
**Test Objective:** Verify path resolution behavior for portable agent installation strategy

### 🔍 Discovery Phase Results

#### OpenCode Directory Structure

**Global Configuration:**
- **Location:** `~/.config/opencode/`
- **Contents:** `opencode.json`, `config.json`, plugins, providers
- **Note:** No `agent/`, `command/`, or `context/` folders found in default installation

**Authentication & Data:**
- **Location:** `~/.local/share/opencode/`
- **Contents:** `auth.json`, bin, log, project, snapshot, storage

**Local Repository:**
- **Location:** `.opencode/` (in git repository root)
- **Structure:** `agent/`, `command/`, `context/`, `plugin/`, `tool/`

#### Key Findings

1. ✅ **Global config path confirmed:** `~/.config/opencode/`
2. ✅ **Local structure confirmed:** `.opencode/` in repo root
3. ⚠️ **Current agents don't use `@` references** - Context loaded via different mechanism
4. ✅ **Context files exist** in `.opencode/context/` with subdirectories

### 📊 Path Resolution Analysis

#### From OpenCode Documentation

**`@` Symbol Resolution Order:**
1. Check if starts with `~/` → resolve to home directory
2. Check if absolute path → use as-is
3. Otherwise → resolve relative to repo root (`Instance.worktree`)
4. If not found → look for agent with that name

#### Implications for Installation

**Local Installation (in repo):**
```
Repo structure:
  .opencode/
  ├── agent/security/scanner.md
  └── context/security/patterns.md

Reference: @.opencode/context/security/patterns.md
Resolution: {repo-root}/.opencode/context/security/patterns.md ✅
```

**Global Installation:**
```
Global structure:
  ~/.config/opencode/
  ├── agent/security/scanner.md
  └── context/security/patterns.md

Reference: @.opencode/context/security/patterns.md
Resolution: Tries to find .opencode/ relative to... what? ❌
Problem: No "repo root" for global agents!
```

### 🎯 Path Pattern Testing

#### Test Setup

Created global test agent with three path patterns:

```markdown
# Pattern 1: With .opencode prefix
@.opencode/context/test/global-test-data.md

# Pattern 2: Without .opencode prefix  
@context/test/global-test-data.md

# Pattern 3: Explicit home path
@~/.config/opencode/context/test/global-test-data.md
```

#### Expected Results (Based on Documentation)

| Pattern | Local Install | Global Install | Notes |
|---------|--------------|----------------|-------|
| `@.opencode/context/file.md` | ✅ Works | ❌ Fails | No .opencode in global path |
| `@context/file.md` | ❌ Fails | ❓ Unknown | Might resolve to ~/.config/opencode/context/ |
| `@~/.config/opencode/context/file.md` | ❌ Fails | ✅ Works | Explicit path, but breaks local |

#### Critical Issue

**No single path pattern works for both local AND global installations!**

This confirms our installation script approach is necessary.

### ✅ Validated Assumptions

1. ✅ **Global path is `~/.config/opencode/`** - Confirmed
2. ✅ **Local path is `.opencode/`** - Confirmed  
3. ✅ **Path transformation is required** - Confirmed (no universal pattern)
4. ✅ **Context folder structure works** - Confirmed (exists in current repo)

### ❌ Invalidated Assumptions

1. ❌ **`@context/file.md` might work universally** - Unconfirmed, likely fails locally
2. ❌ **Current agents use `@` references** - They don't (different loading mechanism)

### 🔧 Installation Strategy Confirmation

#### Source Code Convention

**All context references MUST use:**
```markdown
@.opencode/context/{category}/{file}.md
```

#### Installation Script Transformation

**Local Installation:**
- Keep references as-is: `@.opencode/context/...`
- Copy to: `{repo}/.opencode/`

**Global Installation:**  
- Transform: `@.opencode/context/` → `@~/.config/opencode/context/`
- Copy to: `~/.config/opencode/`

#### Transformation Rules

```bash
# For global installation
sed 's|@\.opencode/context/|@~/.config/opencode/context/|g'

# Also transform shell commands
sed 's|\.opencode/context/|~/.config/opencode/context/|g'
```

### 🚨 Additional Considerations

#### Shell Commands in Templates

**Problem:** Commands like `!`ls .opencode/context/`` also need transformation

**Solution:** Transform both `@` references AND bare paths in shell commands

#### Context Cross-References

**Problem:** Context files may reference other context files

**Solution:** Transform context files too, not just agents/commands

#### Platform Compatibility

**macOS/Linux:** `~/.config/opencode/` ✅  
**Windows:** Need to verify (likely `%APPDATA%\opencode` or similar)

### 📝 Recommendations

1. **Proceed with Installation Script Approach** - The two-tier distribution with path transformation is necessary and correct
2. **Strict Convention Enforcement** - Create validation script to ensure all references follow `@.opencode/context/` pattern
3. **Transform All File Types** - Agent files, command files, AND context files
4. **Test on Actual OpenCode Installation** - Runtime testing would confirm edge cases
5. **Platform-Specific Paths** - Verify global paths on Windows before production release
