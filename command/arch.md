---
description: Автоматическая генерация интерактивных C4 Container и Component архитектурных диаграмм в Mermaid
---

# Architecture Command | Команда /arch

## Назначение
Сформировать актуальную, живую архитектурную карту системы на базе AST-анализа исходного кода, роутов, DTO, БД и Docker-манифестов.

## Вход
- `/arch` — полная генерация C4 диаграмм проекта
- `/arch <модуль>` — локальная диаграмма компонентов для выбранной подсистемы

## Пример вывода
```markdown
## 🏛️ Архитектурная карта системы (C4 Model)

```mermaid
graph TD
    User["👤 Developer / User"]
    OpenAgent["🤖 OpenAgent (Orchestrator)"]
    SwarmSlate["🧠 Swarm Memory Slate"]
    
    subgraph CoreAgents["Core Execution Team"]
        Coder["💻 Coder"]
        Tester["🧪 Tester"]
        Reviewer["🛡️ Reviewer"]
        Architect["📐 Architect"]
        DevOps["🚢 DevOps"]
    end

    User -->|Prompts & Commands| OpenAgent
    OpenAgent -->|Shared State| SwarmSlate
    OpenAgent -->|Delegates| CoreAgents
```
```
