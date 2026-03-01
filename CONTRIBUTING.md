# Contributing to CodeAtlas-Lite

First off, thank you for considering contributing to CodeAtlas-Lite! This document is a set of guidelines for contributing to this repository.

## 🌟 The Open-Core Philosophy

**CodeAtlas-Lite** is the open-source version of the CodeAtlas engine. While this repository contains the core orchestration engine, fundamental agents (`openagent`, `contextscout`, `coder`, `reviewer`), and core skills, the advanced enterprise features and specialized agents are maintained in the private Pro repository.

We openly welcome contributions to the Lite engine. Improvements to the core orchestration, bug fixes to the agent prompt constraints, and general optimization of the included skills are highly appreciated.

If you are developing complex, highly specialized enterprise skills or new orchestration agents, consider using them in your own local layer or contacting us for Pro integration.

## 🐛 Reporting Bugs

If you find a bug in the source code or agent behavior, you can help us by submitting an issue to our GitHub Repository. Even better, you can submit a Pull Request with a fix.

- Use a clear and descriptive title for the issue to identify the problem.
- Describe the exact steps which reproduce the problem in as many details as possible.
- Provide specific examples to demonstrate the steps.

## ✨ Suggesting Enhancements

We welcome suggestions for new features and enhancements.
- Outline the concept clearly.
- Provide a compelling use case.
- Note whether you see this fitting in the Lite engine or as part of a wider ecosystem.

## 💻 Submitting Pull Requests

1. Fork the repository and create your branch from `main`.
2. Ensure your prompt changes follow the strict declarative contract structure.
3. Test the agent behavior locally using the validation script to ensure governance:
   `node validate-runtime-governance.mjs`
4. Ensure your code or prompt tweaks don't introduce logical infinite loops between agents.
5. Create an issue to track the change, and reference the issue in your PR description.

## ⚖️ Code of Conduct

Help us keep CodeAtlas-Lite welcoming and inclusive. Please be respectful and professional in all interactions.

Thank you for helping to improve CodeAtlas!
