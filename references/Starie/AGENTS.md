# OpenCode Agents - Global Rules & Guidelines

## 🎯 Core Principles

### Token Economy (CRITICAL)
- **ALWAYS** prefer lower model variants when task allows
- Use `minimal` for simple questions and lookups
- Use `low` for straightforward tasks
- Use `medium` for code generation and analysis
- Use `high` for complex reasoning and critical decisions
- **AVOID `xhigh`** - extremely expensive, rarely needed
- When uncertain, start lower - can escalate if needed

### Language Matching
- **ALWAYS** respond in the user's language
- Detect language from user's message
- All outputs, reports, and saved files must match user's language

### Quality Standards
- Follow SOLID principles
- Write clean, maintainable code
- Include proper error handling
- Add type hints/annotations
- Document public APIs
- Consider security implications

---

## 📁 Agent Categories

### 🔀 Router (`planning/router`)
**Purpose**: Intelligent task routing
**When to use**: Default entry point - analyzes requests and delegates
**Model**: `google/antigravity-gemini-3-flash:minimal`

### ❓ Q&A (`ask/code`)
**Purpose**: Answer questions about codebase
**When to use**: "How does X work?", "Where is Y?", "What is Z?"
**Mode**: Read-only, never modifies files
**Model variant**: `minimal` to `low`

### 🔬 Research Agents (`planning/research-*`)

| Agent | Purpose | Model Variant |
|-------|---------|---------------|
| `research-codebase` | Investigate existing code | `low` |
| `research-solution` | Analyze approaches, compare options | `medium` |
| `research-web` | Search external docs, examples | `low` |

### 📐 Planning Agents (`planning/*`)

| Agent | Purpose | Model Variant |
|-------|---------|---------------|
| `architecture-designer` | Create ADRs, system design | `medium` |
| `decomposition` | Break tasks into subtasks | `low` |
| `creative` | Brainstorm ideas | `medium` |
| `minimalist-ai-architect` | Quick AI prototypes | `low` |

### 👨‍💻 Developer Agents (`build/*`)

| Agent | Purpose | Model Variant |
|-------|---------|---------------|
| `csharp-senior-developer` | C#/.NET development | `medium` |
| `python-senior-developer` | Python development | `medium` |
| `typescript-vue-developer` | Vue/TypeScript frontend | `medium` |

---

## ⚡ Model Variants Guide

### Minimal (`minimal`)
- **Use for**: Simple questions, yes/no, factual lookups
- **Token budget**: ~500-2000
- **Examples**: "What is SOLID?", "Where is config file?"

### Low (`low`)
- **Use for**: Code search, documentation, simple analysis
- **Token budget**: ~2000-8000
- **Examples**: "Find all usages of X", "How is auth implemented?"

### Medium (`medium`)
- **Use for**: Code generation, architecture, complex analysis
- **Token budget**: ~8000-30000
- **Examples**: "Write a service for X", "Design caching layer"

### High (`high`)
- **Use for**: Complex reasoning, critical decisions, deep analysis
- **Token budget**: ~30000-60000
- **Examples**: Complex refactoring, critical architecture decisions, multi-step reasoning

### XHigh (`xhigh`) ⚠️
- **Use for**: Extremely complex tasks requiring maximum reasoning
- **Token budget**: ~60000+
- **⚠️ WARNING**: Very expensive! Avoid unless absolutely necessary
- **Examples**: Rarely needed - only for exceptional cases

---

## 🛠️ Workflow Guidelines

### Before Writing Code
1. **Understand** - Clarify requirements
2. **Research** - Check existing patterns (grep, glob, read)
3. **Plan** - Design solution before coding
4. **Implement** - Follow discovered conventions
5. **Test** - Write tests for critical code
6. **Verify** - Self-check against quality standards

### Directory Validation (CRITICAL for bash)
```bash
# ALWAYS run before any command
pwd
# Find project files
find . -name "*.sln" -o -name "*.csproj" -o -name "package.json"
```

### Subagent Usage
- Use `planning/research-codebase` for code investigation
- Use `planning/research-web` for external documentation
- Launch in PARALLEL when queries are independent
- Iterate if first results are insufficient

---

## 📝 Output Standards

### Code Files
- Follow project naming conventions
- Include proper imports
- Add type hints/annotations
- Document public APIs with comments

### Research Reports
- Save to appropriate `docs/` subdirectory
- Use timestamp in filename: `{YYYYMMDD}-{HHMMSS}-{topic}.md`
- Include sources and references

### Architecture Decisions
- Save to `docs/arch/decisions/`
- Use ADR format: `ADR-{NNNN}-{topic}.md`
- Include diagrams (Mermaid)

### Task Decomposition
- Save to `docs/tasks/{task-name}/`
- Create README.md with summary
- Individual task files: `task-001-*.md`

---

## 🔒 Security Rules

### Never Do
- ❌ Hardcode secrets or credentials
- ❌ Use string concatenation for SQL
- ❌ Trust user input without validation
- ❌ Expose sensitive data in logs
- ❌ Use `any` type in TypeScript

### Always Do
- ✅ Use parameterized queries
- ✅ Validate and sanitize input
- ✅ Use environment variables for secrets
- ✅ Implement proper authentication
- ✅ Follow OWASP guidelines

---

## 🚀 Performance Guidelines

### Code
- Use async/await for I/O operations
- Avoid N+1 queries in database access
- Use connection pooling
- Implement caching where appropriate
- Lazy load when possible

### Token Usage
- Keep prompts concise
- Use lower model variants
- Avoid unnecessary context
- Batch related operations

---

## 📋 Quick Reference

### Common Commands
```
/quick [question]     - Fast answer, minimal tokens
/plan [feature]       - Create implementation plan
/review [code]        - Code review
/optimize [code]      - Performance optimization
/test [feature]       - Generate tests
/doc [code]           - Generate documentation
/fix [error]          - Quick error fix
/explain [code]       - Code explanation
/refactor [code]      - Code refactoring
/debug [problem]      - Debug and find bugs
```

### Agent Selection Cheat Sheet
| Task | Agent | Variant |
|------|-------|---------|
| Simple question | `ask/code` | minimal |
| Find code | `research-codebase` | low |
| Compare options | `research-solution` | medium |
| External docs | `research-web` | low |
| System design | `architecture-designer` | medium |
| Break down task | `decomposition` | low |
| Write C# code | `csharp-senior-developer` | medium |
| Write Python | `python-senior-developer` | medium |
| Write Vue/TS | `typescript-vue-developer` | medium |
| Brainstorm | `creative` | medium |

---

## 🌐 Environment

- **OS**: Windows
- **Shell**: PowerShell (prefer pwsh 7+)
- **Paths**: Use Windows-style (`C:\path\to\file`)
- **Commands**: Use PowerShell syntax

### PowerShell Equivalents
| Unix | PowerShell |
|------|------------|
| `ls` | `Get-ChildItem` |
| `cat` | `Get-Content` |
| `rm -rf` | `Remove-Item -Recurse -Force` |
| `export VAR=val` | `$env:VAR = "val"` |
| `&&` | `;` |
