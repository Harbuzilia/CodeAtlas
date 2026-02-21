# OpenCode Global Instructions

## 🌐 Environment (Windows + PowerShell)

- **OS**: Windows
- **Shell**: PowerShell (prefer pwsh 7+, fallback Windows PowerShell 5.1)
- **Paths**: Windows-style (`C:\path\to\file`), quote paths with spaces

### PowerShell Syntax
```powershell
# Environment variables
$env:NAME = "value"

# Chain commands (use ; not &&)
command1 ; command2

# Check exit code
$LASTEXITCODE

# Common equivalents
Get-ChildItem      # ls
Get-Content        # cat
Remove-Item -Recurse -Force  # rm -rf
Copy-Item          # cp
Move-Item          # mv
```

---

## 💰 Token Economy (CRITICAL)

### Model Variant Selection
| Complexity | Variant | Token Budget | Use For |
|------------|---------|--------------|---------|
| Trivial | `minimal` | ~500-2K | Yes/no, factual, simple lookups |
| Low | `low` | ~2K-8K | Code search, docs, simple analysis |
| Medium | `medium` | ~8K-30K | Code generation, architecture |
| High | `high` | ~30K-60K | Complex reasoning, critical decisions |
| XHigh | `xhigh` | ~60K+ | ⚠️ Avoid - extremely expensive |

### Rules
1. **Default to lower variants** - escalate only if needed
2. **Use `high` for complex tasks** - it's fine when needed
3. **Avoid `xhigh` variant** - extremely expensive, rarely justified
4. **Keep prompts concise** - no unnecessary context
5. **Batch operations** - combine related tasks
6. **Use compaction** - enabled at 60K tokens

### Quick Commands for Economy
- `/quick [question]` - Minimal tokens, fast answer
- `/doc [code]` - Documentation with `low` variant

---

## 🗣️ Language Matching

**ALWAYS respond in the user's language:**
- Detect language from user's message
- All responses in that language
- All saved files in that language
- All reports and documentation in that language

---

## 🔄 Workflow Standards

### Before Any Code
1. `pwd` - Verify current directory
2. Research existing patterns (grep, glob, read)
3. Understand project conventions
4. Plan before implementing

### Code Quality
- Follow SOLID principles
- Add type hints/annotations
- Include error handling
- Document public APIs
- Consider security (OWASP)

### Output Locations
| Type | Path | Format |
|------|------|--------|
| Research | `docs/research/{type}/` | `{YYYYMMDD}-{HHMMSS}-{topic}.md` |
| Architecture | `docs/arch/decisions/` | `ADR-{NNNN}-{topic}.md` |
| Tasks | `docs/tasks/{name}/` | `README.md` + `task-NNN-*.md` |
| Creative | `docs/creative/` | `{YYYYMMDD}-{HHMMSS}-{topic}.md` |
| AI Projects | `docs/ai-projects/` | `{YYYYMMDD}-{HHMMSS}-{name}-plan.md` |

---

## 🚫 Never Do

- ❌ Hardcode secrets/credentials
- ❌ SQL string concatenation
- ❌ Trust unvalidated input
- ❌ Use `any` in TypeScript
- ❌ Skip error handling
- ❌ Use `xhigh` variant without explicit need

## ✅ Always Do

- ✅ Parameterized queries
- ✅ Input validation
- ✅ Environment variables for secrets
- ✅ Async/await for I/O
- ✅ Lower model variants first
- ✅ Match user's language
