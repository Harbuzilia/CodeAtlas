---
name: typescript
description: typescript skill reference
---

# TypeScript Skill

> **Context7**: API детали — через `context7_get_library_docs`. Этот файл — паттерны и требования, не справочник.

## Когда использовать

TypeScript 5.x strict | React 19+/Next.js 15+ (App Router) | Vue 3/Nuxt 3 | Node.js/Bun/Deno | API-контракты

---

## Обязательный протокол

- Перед кодом — минимальный безопасный план изменений.
- Типы и runtime-проверки согласованы (type + validation schema).
- Нет лишней абстракции без явной пользы.
- Изменение API-контракта → тесты + docs-sync.

## Требования

- `tsconfig`: `strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitReturns: true`.
- **Interfaces** для объектов (расширяемость), **types** для unions/primitives/utilities.
- **Zod** (или эквивалент) для runtime validation на границах: API responses, form data, env.
- Нет `any` — только `unknown` + narrowing.
- Async функции обрабатывают ошибки; `useEffect` имеет cleanup.

```typescript
// Паттерн: Zod как источник типа
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;
```

---

## React 19 / Next.js 15

- **Server Component по умолчанию**; `'use client'` только для интерактивности (state, events, browser APIs).
- Мутации — через Server Actions (`'use server'`) + `revalidatePath`.
- Custom hooks: типизированный return `{ data, loading, error }`, cleanup в useEffect (флаг `cancelled` или AbortController).
- State: Zustand для клиентского состояния; server state — через Server Components/fetch cache, не дублировать в store.
- Props строго типизированы; `variant`-пропы через union-литералы, не boolean-флаги.

## Vue 3 / Nuxt 3

- `<script setup lang="ts">`, `defineProps<Props>()`, типизированный `defineEmits<{ (e: 'update', v: T): void }>()`.
- Переиспользуемая логика — composables (`useX`), возвращают refs.

---

## Tooling (если есть в проекте)

`pnpm typecheck && pnpm lint && pnpm test` — основной quality gate. Отсутствующий tooling не добавлять без запроса.

## Чек-лист перед коммитом

- [ ] `strict: true`, нет `any`
- [ ] Типы и runtime-validation согласованы (Zod на границах)
- [ ] Server/Client components разделены корректно
- [ ] Async ошибки обработаны, useEffect cleanup есть
- [ ] При API change обновлены тесты и docs-sync
- [ ] Для рискованных изменений указан rollback/mitigation план
