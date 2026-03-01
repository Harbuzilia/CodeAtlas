---
name: typescript
description: typescript skill reference
---

# TypeScript Skill

> **Context7**: Для API деталей — используй `context7_get_library_docs` для React, Vue, Next.js, Node.js.
> Этот файл — **паттерны и архитектура**, не справочник по API.

---

## Когда использовать

Загружай этот скилл при работе с:
- TypeScript 5.x (strict mode)
- React 18+/Next.js App Router
- Vue 3 / Nuxt 3
- Node.js / Express / Fastify
- Bun / Deno
- API-контракты и typed client/server integration

---

## TypeScript Best Practices

### Human-grade protocol (обязательно)
- Перед кодом формулируй минимальный безопасный план изменений.
- Держи типы и runtime-проверки согласованными (type + validation schema).
- Избегай лишней абстракции и "умных" конструкций без явной пользы.
- Любое изменение API-контракта сопровождай тестами и docs-sync.

### Строгая типизация

```typescript
// ✅ tsconfig.json — всегда strict
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true
  }
}
```

### Типы vs Интерфейсы

```typescript
// ✅ Интерфейсы для объектов (расширяемые)
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ Types для unions, primitives, utilities
type Status = 'pending' | 'active' | 'disabled';
type UserWithPosts = User & { posts: Post[] };

// ✅ Zod для runtime validation
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;
```

### Utility Types

```typescript
// Partial — все поля optional
type UpdateUser = Partial<User>;

// Pick — выбрать поля
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit — исключить поля
type CreateUser = Omit<User, 'id'>;

// Record — словарь
type UserMap = Record<string, User>;
```

---

## React Patterns

### Компоненты

```typescript
// ✅ Функциональные компоненты с типами
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function Button({ 
  children, 
  onClick, 
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

### Custom Hooks

```typescript
// ✅ Хуки с правильной типизацией
function useUser(id: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchUser() {
      try {
        const data = await api.getUser(id);
        if (!cancelled) setUser(data);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    fetchUser();
    return () => { cancelled = true; };
  }, [id]);

  return { user, loading, error };
}
```

### State Management

```typescript
// ✅ Zustand — простой и типобезопасный
import { create } from 'zustand';

interface AuthStore {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
```

---

## Vue 3 Patterns

### Composition API

```typescript
// ✅ script setup с типами
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Props {
  userId: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'update', user: User): void;
}>();

const user = ref<User | null>(null);
const loading = ref(true);

const displayName = computed(() => 
  user.value?.name ?? 'Unknown'
);

onMounted(async () => {
  user.value = await fetchUser(props.userId);
  loading.value = false;
});
</script>
```

### Composables

```typescript
// ✅ Переиспользуемая логика
export function useUser(id: Ref<string>) {
  const user = ref<User | null>(null);
  const loading = ref(true);
  
  watch(id, async (newId) => {
    loading.value = true;
    user.value = await fetchUser(newId);
    loading.value = false;
  }, { immediate: true });
  
  return { user, loading };
}
```

---

## Next.js App Router

### Server Components

```typescript
// ✅ По умолчанию — Server Component
async function UserPage({ params }: { params: { id: string } }) {
  const user = await db.user.findUnique({ 
    where: { id: params.id } 
  });
  
  if (!user) notFound();
  
  return <UserProfile user={user} />;
}
```

### Client Components

```typescript
// ✅ Явная директива для интерактивности
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}
```

### Server Actions

```typescript
// ✅ Мутации на сервере
'use server';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  
  await db.user.create({ data: { name, email } });
  revalidatePath('/users');
}
```

---

## Modern Tooling (если есть в проекте)

```bash
pnpm typecheck
pnpm lint
pnpm test
```

- Если tooling отсутствует, не добавляй его автоматически без запроса.
- Если tooling есть, используй его как основной gate качества.

## Чек-лист перед коммитом

- [ ] `strict: true` в tsconfig
- [ ] Нет `any` (используй `unknown` если надо)
- [ ] Типы и runtime-validation согласованы
- [ ] Props/API contracts строго типизированы
- [ ] Async функции обрабатывают ошибки
- [ ] useEffect имеет cleanup функцию
- [ ] Server/Client components разделены
- [ ] Zod (или эквивалент) для runtime validation
- [ ] При API change обновлены тесты и docs-sync
- [ ] Для рискованных изменений указан rollback/mitigation план
