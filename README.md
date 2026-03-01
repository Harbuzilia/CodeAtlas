<p align="center">
  <img src="./logo.jpg" alt="CodeAtlas Logo" style="width: 100%; max-width: 800px;"/>
</p>

# 🚀 CodeAtlas-Lite

> **High-Performance Multi-Agent Orchestration Framework**

CodeAtlas-Lite is the public open-core version of the powerful **CodeAtlas** agentic ecosystem. It is an advanced autonomous multi-agent orchestration engine designed to turn large language models into highly capable, autonomous software engineering teams. 

Unlike basic agent wrappers, CodeAtlas implements a strictly enforced **deterministic delegation workflow**: agents don't just chat; they analyze, plan, route, execute, and validate in a structured pipeline.

---

## 🔥 The "Wow" Factor: Why CodeAtlas?

- **🧠 True Agent-to-Agent Delegation:** Tasks are automatically routed. `OpenAgent` acts as an orchestrator, delegating complex system analysis to `ContextScout`, writing tasks to `Coder`, and validation to `Reviewer`.
- **⚡ AST-Driven Code Perception:** Not just grep. Powered by `ast-index` and `repomap`, CodeAtlas truly understands your codebase topology, class hierarchies, and call graphs.
- **🔒 Strict Runtime Governance:** No hallucinations running wild. Workflows are governed by strict Markdown contracts and validation scripts ensuring serial, deterministic execution.
- **🧩 Pluggable Skill System:** Easily extend capabilities. "Skills" define language-specific nuances or external tool integrations injected directly into the agent context dynamically.

---

## 🛠️ Architecture

```bash
User Request
   └── OpenAgent (The Director)
         ├─> ContextScout (Analyzes repo structure, AST, and dependencies)
         ├─> Coder (Implements exact code logic and modifies files)
         └─> Reviewer (Audits Diff and enforces clean-code strategies)
```

### Components in this Repository

- `/agents`: The prompt contracts defining agent behaviors and strict constraints.
- `/context`: System workflows, delegation rules, and codebase identity.
- `/skills`: Injectable toolsets. This Lite version includes foundational skills: `python`, `typescript`, `git`, `repomap`, `ast-index`.
- `codeatlas.json`: The core routing and configuration manifest.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) & [npm](https://www.npmjs.com/)
- An API Key from [OpenRouter](https://openrouter.ai/) (or a compatible LLM provider)
- [Aider](https://aider.chat/) (Used as the low-level CLI context bridge)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/YourUsername/CodeAtlas-Lite.git
   cd CodeAtlas-Lite
   ```

2. Initialize your project environment:
   ```bash
   ./codeatlas-init.sh
   ```

3. Configure your API key. Edit `.codeatlas/codeatlas.json` (or place in `~/.config/codeatlas/codeatlas.json`) to add your model endpoints and OpenRouter API key.

4. Run CodeAtlas:
   Start interacting with your terminal wrapper or UI tool configured to point to these agents!

---

## 💳 CodeAtlas-Lite vs. CodeAtlas Pro

This repository houses the **CodeAtlas-Lite** engine. It is a fully functional slice of the architecture providing immense value for single developers and open-source experiments.

For enterprise teams, complex monorepos, and mission-critical systems, **CodeAtlas Pro** includes the following extended capabilities:

### What's in the full version?
- **Advanced Agents:** `Planner`, `Tester`, `Debugger`, `DocWriter`, and `ExternalScout`.
- **Comprehensive Skill Library:** 50+ enterprise skills including `security-owasp`, `incident-response`, `devops-docker`, `api-change-safe`, and dynamic configuration migrations.
- **Context7 MCP Integration:** Real-time deep Web/API documentation scraping for external libraries.
- **Strict One-Shot Execution Profiles:** Parallel analysis, automated dependency resolution, and deep project telemetry.

### Contact ✉️
Interested in **CodeAtlas Pro**, dedicated support, or deploying this architecture internally at your company?
**Contact the creator for enterprise access, feature details, and consulting inquiries.**

---

## 📜 Contributing
We welcome issues, PRs, and feature ideas for the Lite engine. Read our [CONTRIBUTING.md](CONTRIBUTING.md) for details on code of conduct and the pull request process.

## ⚖️ License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
