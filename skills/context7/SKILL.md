---
name: context7
description: context7 skill reference
---

# Context7 Integration Skill

> **Этот скилл — ОБЯЗАТЕЛЬНЫЙ для работы с внешними библиотеками.**
> Не гадай по памяти — Context7 даёт актуальные доки.

---

## Когда использовать Context7

**ВСЕГДА когда:**
- Работаешь с внешней библиотекой (не stdlib)
- Не уверен в актуальном API
- Библиотека обновилась (React 19, Next.js 15, Pydantic v2, etc.)
- Нужны примеры использования

**НЕ НУЖНО когда:**
- Базовый синтаксис языка (for, if, functions)
- Очевидные операции (string concat, array methods)

---

## Как использовать

### Шаг 1: Найти библиотеку

```
context7_resolve_library_id(library="next.js")
→ Returns: context7_id = "vercel/next.js"
```

### Шаг 2: Получить документацию

```
context7_get_library_docs(
  context7_id="vercel/next.js",
  topic="server actions"
)
→ Returns: актуальная документация по server actions
```

---

## Частые библиотеки

| Библиотека | context7_id | Популярные topics |
|------------|-------------|-------------------|
| Next.js | `vercel/next.js` | app router, server actions, middleware |
| React | `facebook/react` | hooks, suspense, server components |
| Vue | `vuejs/core` | composition api, reactivity, teleport |
| Drizzle ORM | `drizzle-team/drizzle-orm` | schema, migrations, queries |
| Prisma | `prisma/prisma` | schema, client, migrations |
| FastAPI | `tiangolo/fastapi` | dependencies, security, websockets |
| Pydantic | `pydantic/pydantic` | validators, settings, serialization |
| tRPC | `trpc/trpc` | routers, procedures, react query |
| Tailwind | `tailwindlabs/tailwindcss` | config, plugins, dark mode |
| Zustand | `pmndrs/zustand` | store, middleware, persist |

---

## modern-design-research profile

Use this profile when user asks for modern UI/design refresh, new template/library, or up-to-date design stack.

Profile steps:
1. Resolve target UI stack/library IDs (framework + component libraries).
2. Fetch latest stable versions and major recent changes.
3. Extract candidate libraries/templates with pros/cons for project context.
4. Produce a `Design Decision Lock` block before implementation:
   - Versions/Changes
   - Candidate Libraries/Templates
   - Chosen Stack
   - Sources

## modern-backend-research profile

Use this profile when user asks to modernize backend stack, upgrade server framework/ORM/auth/cache/queue, or align with latest stable versions.

Profile steps:
1. Resolve target backend libraries/framework IDs.
2. Fetch latest stable versions and recent breaking changes.
3. Build candidate upgrade paths (minimal-risk first).
4. Produce a `Backend Upgrade Decision Lock` block before implementation:
   - Versions/Changes
   - Current Stack Snapshot
   - Candidate Upgrades
   - Chosen Stack
   - Compatibility/Risks
   - Rollback Plan
   - Sources

## Workflow с Context7

```
1. Определи какую библиотеку используешь
   ↓
2. context7_resolve_library_id(library="...")
   ↓
3. context7_get_library_docs(id="...", topic="нужная тема")
   ↓
4. Применяй полученную документацию
   ↓
5. НЕ угадывай API — всегда проверяй через Context7
```

---

## Пример полного workflow

**Задача:** Добавить server action в Next.js

```
// Шаг 1: Получить доки
context7_resolve_library_id(library="next.js")
→ "vercel/next.js"

context7_get_library_docs(
  context7_id="vercel/next.js",
  topic="server actions form"
)

// Шаг 2: Получаем актуальный API
→ Server Actions должны иметь 'use server' директиву
→ Можно использовать с <form action={...}>
→ Для revalidation: revalidatePath() или revalidateTag()

// Шаг 3: Реализуем по документации
'use server'

export async function createUser(formData: FormData) {
  // ... implementation based on docs
  revalidatePath('/users')
}
```

---

## Типичные ошибки

### ❌ Не делай так:

```
"Я помню, что в React 18 это делалось так..."
→ React 19 уже вышел, API мог измениться
```

### ✅ Делай так:

```
context7_get_library_docs(
  context7_id="facebook/react",
  topic="use hook"  // новый hook в React 19
)
→ Получаешь актуальную информацию
```

---

## Когда Context7 недоступен

Если Context7 не отвечает или библиотека не найдена:

1. Попробуй точное имя: `drizzle-orm` вместо `drizzle`
2. Попробуй organization/repo: `vercel/next.js`
3. Если не работает — используй `externalscout` для веб-поиска
4. Последний вариант — спроси пользователя

---

## Интеграция с агентами

- **`coder`** — использует Context7 перед реализацией
- **`contextscout`** — рекомендует `externalscout`, когда локального контекста недостаточно
- **`externalscout`** — специализированный агент для Context7
