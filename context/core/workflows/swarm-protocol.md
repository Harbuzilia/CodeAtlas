---
title: Swarm Shared Memory Protocol
description: Протокол роевого взаимодействия и общей рабочей памяти агентов (Shared Slate)
---

# Swarm Shared Memory Protocol

## Назначение
Исключить дублирование контекста и потерю нюансов при многоэтапной передаче задач между агентами (`architect` → `coder` → `tester` → `reviewer` → `devops`).

---

## 1. Структура общей памяти (`.opencode/shared_memory.json`)

```json
{
  "active_goal": "Implement Stripe subscription billing with webhooks",
  "discovered_facts": [
    "Project uses Fastify + PostgreSQL + Prisma",
    "Authentication is based on JWT in Authorization header"
  ],
  "rejected_hypotheses": [
    "Poller approach for Stripe rejected due to high latency -> chosen Webhook with idempotency key"
  ],
  "architectural_invariants": [
    "All DB mutations MUST be wrapped in transactions",
    "All monetary amounts MUST be integer cents (not floating point)"
  ],
  "completed_phases": ["spec_analysis", "adr_generated"],
  "remaining_blockers": []
}
```

---

## 2. Правила работы агентов со Swarm Memory

1. **Перед началом работы**: Агент читает `shared_memory.json` для мгновенного погружения в текущее состояние задачи.
2. **В процессе работы**:
   - При обнаружении нового важного факта о коде — добавляет запись в `discovered_facts`.
   - При проверке и отбрасывании нерабочей идеи — добавляет в `rejected_hypotheses` с обоснованием (чтобы следующие агенты не наступали на те же грабли).
3. **После завершения работы**:
   - Помечает свою фазу в `completed_phases`.
   - Обновляет `remaining_blockers`.

---

## 3. Преимущества протокола
- **Экономия токенов до 70%**: Вместо длинных пересказов истории переписки передается только плотный JSON-снимок состояния.
- **Предотвращение повторных ошибок**: Агент `coder` видит, почему `architect` отклонил определенный подход.
