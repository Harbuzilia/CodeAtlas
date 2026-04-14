# Contributing to CodeAtlas

Thanks for contributing to CodeAtlas.

This repository is the maintained public source for the full installable CodeAtlas runtime. Contributions should keep runtime behavior, installer flow, validation, and documentation aligned.

## Scope

Good contribution areas:

- agent prompt and routing improvements
- validator hardening
- installer reliability and UX
- tests and regression coverage
- documentation that reflects actual runtime behavior

Avoid submitting local-only artifacts such as caches, repomap outputs, archives, editor state, or machine-specific support files.

## Before opening a pull request

1. Fork the repository and branch from `main`.
2. Keep changes focused and avoid unrelated cleanup.
3. Update docs if behavior, installation, validation, or public metadata changed.
4. Run the relevant checks from the repository root:

```bash
npm run validate:all
npm run smoke:functional
node --test
```

5. Summarize what changed, why it changed, and what you verified.

## Reporting bugs

Please include:

- a clear title
- the exact files or commands involved
- reproduction steps
- expected behavior vs actual behavior
- relevant logs or validator output

## Suggesting enhancements

Please describe:

- the user or maintainer problem being solved
- the proposed behavior
- whether runtime docs, installer flow, or validation rules would need updates

## Documentation and runtime truth

When documentation conflicts with runtime files, the canonical order is:

1. `opencode.json`
2. `agents/**/*.md`
3. `context/**/*.md`
4. `instructions.md`
5. public documentation such as `README.md`

If your change modifies runtime behavior, update the affected docs in the same pull request.

## Code of conduct

Be respectful, precise, and professional in issues, reviews, and pull requests.
