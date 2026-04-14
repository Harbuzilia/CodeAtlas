# CodeAtlas

<p align="center">
  <img src="./logo.jpg" alt="CodeAtlas Logo" style="width: 100%; max-width: 800px;"/>
</p>

CodeAtlas is the main public repository for the full OpenCode runtime used to install a project-local `.opencode/` workspace.

## What this repository contains

- runtime agents in `agents/`
- shared context and policies in `context/`
- bundled skills in `skills/`
- installer and validators in `scripts/` and `validate-runtime-governance.mjs`
- smoke and regression tests in `tests/`
- runtime manifests in `opencode.json`, `registry.json`, `dcp.jsonc`, and `PROJECT_GUIDE.md`

This repository is **not** a Lite/open-core split. The checked-in runtime is the maintained source of truth for the installable CodeAtlas configuration.

## Installation

### Requirements

- Node.js 18+
- an existing target project directory

### Install into a project

From this repository root:

```bash
npm install
npx opencode-init --target /path/to/your/project
```

Equivalent local command:

```bash
node scripts/install.mjs --target /path/to/your/project
```

The installer:

1. creates or refreshes `<project>/.opencode/`
2. copies runtime manifests, agents, context, and skills
3. bundles `.opencode/bin/ast-index.exe`
4. patches the target project's `.gitignore`
5. runs post-install runtime validation

To preview without writing files:

```bash
node scripts/install.mjs --dry-run --target /path/to/your/project
```

## Development workflow

Install dependencies:

```bash
npm install
```

Run validation:

```bash
npm run validate:all
npm run smoke:functional
node --test
```

Useful commands:

- `npm run install:dry-run`
- `npm run validate:registry`
- `npm run validate:context-refs`
- `npm run validate:frontmatter-sync`
- `npm run validate:runtime`

## Repository structure

```text
CodeAtlas/
├── agents/
├── context/
├── skills/
├── scripts/
├── tests/
├── .opencode/bin/ast-index.exe
├── opencode.json
├── registry.json
├── dcp.jsonc
├── instructions.md
├── PROJECT_GUIDE.md
└── validate-runtime-governance.mjs
```

## Public repository policy

- keep runtime source-of-truth files in this repository clean and reviewable
- do not commit local caches, repomaps, node_modules, archives, or private scratch artifacts
- treat `opencode.json` plus runtime agents/context as canonical behavior
- update docs when install flow, agent behavior, or validation contracts change

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## Repository

- GitHub: <https://github.com/Harbuzilia/CodeAtlas>

## License

See [LICENSE](./LICENSE).
