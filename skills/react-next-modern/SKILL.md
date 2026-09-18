---
name: react-next-modern
description: Архитектура современного Frontend/Fullstack (React 19, Next.js 15 App Router, Tailwind CSS v4, Zustand v5, TanStack Query v5, Shadcn/ui)
---

# React 19 & Next.js 15 Modern Fullstack Skill

## 1. React 19 Паттерны

- **`useActionState`** для форм с Server Actions: `const [state, formAction, isPending] = useActionState(action, null)`; ошибки через `state?.error`, pending — `isPending` на кнопке.
- **`useOptimistic`** для мгновенного UI-фидбека: `const [optimistic, addOptimistic] = useOptimistic(value, (cur, upd) => cur + upd)`.
- Server Components по умолчанию; `'use client'` только для интерактивности (см. typescript skill — без дублирования правил).

## 2. Next.js 15+ App Router

- Data fetching — в Server Components напрямую (`await getData()`), кешируется fetch-кешем.
- Мутации — Server Actions (`'use server'`) + `revalidatePath`/`revalidateTag`.

## 3. Tailwind CSS v4 (CSS-first)

Конфигурация в CSS, не в `tailwind.config.js`:

```css
@import "tailwindcss";

@theme {
  --color-primary-500: #3b82f6;
  --font-display: 'Inter', sans-serif;
}
```

Динамические классы — `cn()` (clsx + tailwind-merge).

## 4. State

- **Client state** — Zustand v5 (`create<State>()(...)`), глобальные сторы по доменам.
- **Server state** — TanStack Query v5 (кеш, retries, invalidation), НЕ дублировать в Zustand.

## 5. Чек-лист качества фронтенда

- [ ] `useActionState`/`useOptimistic` вместо ручных isLoading-флагов
- [ ] Server/Client Components разделены
- [ ] Формы валидируются Zod / React Hook Form
- [ ] Нет Layout Shifts (CLS) — изображения с `width`/`height` или `fill`
- [ ] Tailwind v4 `@theme` вместо js-config
