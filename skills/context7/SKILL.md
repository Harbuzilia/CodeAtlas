---
name: context7
description: "Актуальные доки внешних библиотек через Context7 MCP (resolve_library_id → get_library_docs): обязателен при неуверенности в API и мажорных обновлениях (React 19, Pydantic v2) вместо памяти"
---

# Context7 Integration Skill

> **ОБЯЗАТЕЛЬНЫЙ для внешних библиотек.** Не гадай по памяти — Context7 даёт актуальные доки.

## Когда

**ВСЕГДА:** внешняя библиотека (не stdlib), неуверенность в актуальном API, мажорные обновления (React 19, Pydantic v2).
**НЕ НУЖНО:** базовый синтаксис языка, очевидные операции.

## Как

```
1. context7_resolve_library_id(library="next.js")  → context7_id
2. context7_get_library_docs(context7_id="vercel/next.js", topic="server actions")
3. Применяй по полученной документации, не по памяти
```

## Частые библиотеки

| Библиотека | context7_id | Популярные topics |
|------------|-------------|-------------------|
| Next.js | `vercel/next.js` | app router, server actions, middleware |
| React | `facebook/react` | hooks, suspense, server components |
| Vue | `vuejs/core` | composition api, reactivity |
| Drizzle ORM | `drizzle-team/drizzle-orm` | schema, migrations, queries |
| Prisma | `prisma/prisma` | schema, client, migrations |
| FastAPI | `tiangolo/fastapi` | dependencies, security, websockets |
| Pydantic | `pydantic/pydantic` | validators, settings |
| Tailwind | `tailwindlabs/tailwindcss` | config, plugins, dark mode |
| Zustand | `pmndrs/zustand` | store, middleware, persist |

## modern-design-research profile

Для UI/design refresh, выбора шаблона/библиотеки:
1. Resolve UI stack IDs (framework + component libraries)
2. Последние stable версии и major changes
3. Кандидаты с pros/cons
4. `Design Decision Lock` перед реализацией: Versions / Candidates / Chosen Stack / Sources

## modern-backend-research profile

Для модернизации backend (framework/ORM/auth/cache/queue):
1. Resolve backend library IDs
2. Stable версии и breaking changes
3. Upgrade paths (minimal-risk first)
4. `Backend Upgrade Decision Lock`: Versions / Current Stack / Candidates / Chosen / Risks / Rollback / Sources

## Если Context7 недоступен

1. Точное имя: `drizzle-orm` вместо `drizzle`, или `org/repo` формат
2. Fallback — агент `externalscout` для веб-поиска
3. Последний вариант — спроси пользователя

## Интеграция

- `coder` — Context7 перед реализацией с внешними либами
- `externalscout` — специализированный агент для Context7
