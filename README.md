<p align="center">
  <img src="./logo.jpg" alt="CodeAtlas Logo" style="width: 100%; max-width: 800px;"/>
</p>

# CodeAtlas-Lite

> **High-Performance Multi-Agent Orchestration Framework**

CodeAtlas-Lite is the public open-core version of the powerful **CodeAtlas** agentic ecosystem. It is an advanced autonomous multi-agent orchestration engine designed to turn large language models into highly capable, autonomous software engineering teams. 

Unlike basic agent wrappers, CodeAtlas implements a strictly enforced **deterministic delegation workflow**: agents don't just chat; they analyze, plan, route, execute, and validate in a structured pipeline.

---

## Core Principles and Capabilities

CodeAtlas is built on a foundation of strict operational rules to prevent LLM hallucinations and endless loops.

- **"Get Shit Done" Philosophy:** A focus on minimal, high-signal changes over broad rewrites. Agents are instructed to be concise, to strictly adhere to done criteria, and to provide actionable outcomes rather than generic conversational filler.
- **Smart Problem Solving:** A built-in fail-fast safety net. Before attempting a blind fix, agents analyze errors, categorize them (User Error, Environmental, Internal Tooling), and apply specific mitigation strategies rather than jumping to alternatives without understanding the root cause.
- **True Agent-to-Agent Delegation:** Tasks are automatically routed. `OpenAgent` acts as an orchestrator, delegating complex system analysis to `ContextScout`, writing tasks to `Coder`, and validation to `Reviewer`.
- **TDD Protocol (Elite Mode):** For any new function, the `Coder` agent strictly enforces a RED-GREEN-REFACTOR cycle, writing a failing test before implementation.
- **Auto-Mitigated Feedback Loops:** If `Reviewer` or `Tester` agents detect anomalies in the `Coder`'s logic, the workflow does not stop. The orchestrator automatically routes the errors back to the `Coder` for up to two revision cycles.
- **Anti-Hang Protocol:** Prevents LLMs from getting stuck in endless thinking processes. Execution paths are bounded by strict step limits and "Fail Fast" timeouts.
- **Context-Aware UI-Localization:** If UI elements are generated, agents dynamically check project settings or prompt the user for the targeted UI language to prevent default English layouts for regional apps.
- **AST-Driven Code Perception:** Not just grep. Powered by the compiled `ast-index` executable and `repomap`, CodeAtlas truly understands your codebase topology, class hierarchies, and call graphs.
- **Strict Runtime Governance:** Workflows are governed by strict Markdown contracts and validation scripts ensuring serial, deterministic execution.
- **Persistent Cognitive Memory (EchoVault):** Through deep Model Context Protocol (MCP) integration with EchoVault, CodeAtlas maintains long-term memory and context across sessions, ensuring agents are aware of previous architectural setups and decisions without starting from scratch.
- **Pluggable Skill System:** Easily extend capabilities. "Skills" define language-specific nuances or external tool integrations injected directly into the agent context dynamically.

---

## Architecture

```bash
User Request
   └── OpenAgent (Orchestrator)
         ├─> ContextScout (Analyzes repo structure, AST, and dependencies)
         ├─> Planner (Breaks down complex tasks into step-by-step plans)
         ├─> Coder (Implements exact code logic and modifies files)
         ├─> Reviewer (Audits Diff and enforces clean-code strategies)
         └─> Tester (Validates logic, creates and runs rigorous tests)
```

### The Lite Repository Structure

```text
CodeAtlas-Lite/
├── agents/                           # Core configuration prompts for agents
│   ├── openagent.md                  # Main routing and delegation orchestrator
│   ├── contextscout.md               # Repo-wide analysis and topology crawler
│   ├── planner.md                    # Strategic step-by-step task breakdown
│   ├── coder.md                      # Code generation and file modification 
│   ├── reviewer.md                   # Diff analysis and standard enforcement
│   └── tester.md                     # Test generation and execution validation
├── skills/                           # Extensible tooling and patterns
│   ├── ast-index/SKILL.md            # Execution profiles for the AST indexer
│   ├── repomap/SKILL.md              # PageRank-based architecture mapping
│   ├── python/SKILL.md               # Baseline language guidelines
│   └── typescript/SKILL.md           # Baseline language guidelines
├── bin/                              # Executables (e.g., ast-index.exe)
├── opencode.json                     # Generic runtime LLM configuration manifest
├── dcp.jsonc                         # Deterministic Context Protocol configuration
├── validate-runtime-governance.mjs   # Strict CI/CD prompt constraint validator
└── README.md                         # Project documentation

### Curated MCP Integrations (Lite)

To keep the Lite version lean and avoid unnecessary telemetry or redundant access protocols, bloated integrations like `filesystem` or generic `memory` have been intentionally excluded. Instead, CodeAtlas-Lite ships with highly targeted MCP servers:

- **Tavily Search (`tavily-search`):** Replacing basic integrations like DuckDuckGo for robust, research-grade web searches.
- **Context7 (`context7`):** Seamless real-time documentation retrieval for external libraries.
- **GitHub Grep (`github-grep`):** Fast pattern matching across external open-source codebases.

---

## Getting Started

### Installation

**CodeAtlas runs entirely out of your global configuration directory.**

1. Clone the repository:
   ```bash
   git clone https://github.com/Harbuzilia/CodeAtlas.git
   ```

2. Copy the contents of this repository to your system's global configuration directory so that `opencode.json` ends up precisely at this path:
   - **Windows:** `C:\Users\Your_Username\.config\opencode\opencode.json`
   - **macOS / Linux:** `~/.config/opencode/opencode.json`

   *Note: The core engine config logic explicitly looks for the `opencode` folder name and requires the global configuration manifest to be exactly at this path.*

3. Set up the AST Executable:
   The `ast-index` tool uses a compiled executable to parse repository structures near-instantly. You can download or build it from [Claude-ast-index-search](https://github.com/defendend/Claude-ast-index-search). You must place your compiled `ast-index.exe` (or binary equivalent for Linux/macOS) into the global `bin/` directory:
   - Path: `~/.config/opencode/bin/ast-index.exe`

4. Configure your API key. Edit `opencode.json` in the configuration directory to add your model endpoints and OpenRouter API key.

5. Initialize in a specific project:
   From your target workspace, run:
   ```bash
   bash ~/.config/opencode/opencode-init.sh
   ```

6. Run CodeAtlas:
   Start interacting with your terminal wrapper or UI tool configured to point to these agents!

---

## CodeAtlas-Lite vs. CodeAtlas Extended

This repository houses the **CodeAtlas-Lite** engine. It is a fully functional slice of the architecture providing immense value for single developers and open-source experiments.

The full internal implementation includes extended capabilities for enterprise teams, complex monorepos, and mission-critical systems:

- **Advanced Enterprise Agents:** `Debugger`, `DocWriter`, and `ExternalScout`.
- **Comprehensive Skill Library:** 50+ enterprise skills including `security-owasp`, `incident-response`, `devops-docker`, `api-change-safe`, and dynamic configuration migrations.
- **Context7 MCP Integration:** Real-time deep Web/API documentation scraping for external libraries.
- **Strict One-Shot Execution Profiles:** Parallel analysis, automated dependency resolution, and deep project telemetry.

### Knowledge Sharing & Showcase

I built CodeAtlas to explore the limits of deterministic autonomous agents. If you want to see how the extended architecture operates in a real enterprise environment, or if you want to understand how to expand this ecosystem with new custom agents and workflows, feel free to reach out.

**Contact the repository owner to discuss advanced implementations, view demonstrations, or collaborate on pushing agentic architecture forward.**

---

## Contributing
We welcome issues, PRs, and feature ideas for the Lite engine. Read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on code of conduct and the pull request process.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
