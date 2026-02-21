# Scratchpad - Opencode1 Audit

## Initial Findings
- **Framework**: OpenCode Agent Framework.
- **Key Components**: 
  - `opencode.json`: Central configuration (models, agents, mcp, plugins, permissions).
  - `agents/*.md`: Markdown-based agent definitions with strict governance rules (SILENT DELEGATION, [RETURN], etc.).
  - `validate-runtime-governance.mjs`: Strict linter for agent markdown files.

## Audit Results based on Global Skills

### 1. Code Quality (`clean-code`, `nodejs-best-practices`)
- **Target**: `validate-runtime-governance.mjs`
- **Issue**: Monolithic file (390+ lines) with zero functional isolation. Validations for `openagent`, `contextscout`, etc., are all dumped in top-level execution scope.
- **Violation**: Breaks Single Responsibility Principle (SRP) and "Functions should be small" rules.
- **Improvement**: Extract logic into modular functions: `validateOpenAgentConfig(text)`, `validateDelegationRules()`, `validateForbiddenPatterns()`. It would make testing and extending the validation much easier.

### 2. Architecture (`architecture`)
- **Target**: `agents/openagent.md` and Delegation flow
- **Issue**: The delegation logic is heavily reliant on fragile string matching and prompt exactness (`Routing` -> Task tool in the same turn). 
- **Improvement**: Consider moving routing logic to a structured middleware or JSON schema step instead of relying on the LLM to output exact markdown text strings for routing.

### 3. Security (`vulnerability-scanner`, `security-owasp`)
- **Target**: `opencode.json` and agent permissions
- **Issue**: The default `bash` permissions in `opencode.json` allow executing most non-destructive commands globally (`*` mapped to `ask`, but some commands mapped to `allow`), but lack specific sandbox isolation for external dependencies.
- **Improvement**: Apply "Defense in Depth". Add tighter permission scoping explicitly denying network calls (e.g., `curl`, `wget`) during tests unless required, mitigating Supply Chain attacks if `npm install` runs malicious scripts during evaluation.
