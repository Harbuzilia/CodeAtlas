# Documentation Standards

> Context: standards/docs | Priority: high

## Principles

1. Clarity — понятно с первого прочтения
2. Conciseness — минимум слов, максимум смысла  
3. Structure — логичная организация
4. Actionable — читатель знает что делать

---

## Document Types

### README.md
```markdown
# Project Name

Brief description (1-2 sentences)

## Quick Start
[minimal steps to run]

## Features
- Feature 1
- Feature 2

## Installation
[steps]

## Usage
[examples]

## License
[license info]
```

### CHANGELOG.md
```markdown
# Changelog

## [Unreleased]

## [1.0.0] - YYYY-MM-DD
### Added
- New feature

### Changed
- Modified behavior

### Fixed
- Bug fix

### Removed
- Deprecated feature
```

### API Documentation
```markdown
## Endpoint Name

`METHOD /path`

### Description
What this endpoint does.

### Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id | string | yes | Resource ID |

### Response
```json
{
  "data": {}
}
```

### Example
[curl or code example]
```

---

## Code Comments

### When to Comment
- Complex algorithms
- Non-obvious decisions
- Workarounds with context
- Public API documentation

### When NOT to Comment
- Obvious code
- Self-explanatory names
- "What" instead of "Why"

### Format
```python
# Good: Why
# Using retry because external API is flaky during peak hours
response = retry(api_call, max_attempts=3)

# Bad: What (obvious from code)
# Calling API
response = api_call()
```

---

## Language

- Match project language (RU/EN)
- Be consistent within document
- Use active voice
- Avoid jargon unless necessary
