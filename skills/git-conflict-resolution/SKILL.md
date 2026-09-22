---
name: git-conflict-resolution
description: Стратегии 3-стороннего слияния Git, семантический анализ конфликтов (ours vs theirs) и безопасное объединение
---

# Git Conflict Resolution Skill

<context>
Этот скилл содержит стандарты и алгоритмы разрешения 3-сторонних конфликтов слияния (`git merge`, `git rebase`), анализа контекста обеих веток и предотвращения потери функционала.
Используется агентами `coder`, `reviewer` и командой `/conflict`.
</context>

## 1. Анатомия маркеров конфликта

```
<<<<<<< HEAD (Ours - текущая ветка)
export function getUser(id: string): Promise<User> {
  return db.users.findUnique({ where: { id } });
}
======= (Разделитель)
export function getUser(id: string, includeRoles = false): Promise<UserWithRoles> {
  return db.users.findUnique({ where: { id }, include: { roles: includeRoles } });
>>>>>>> feature/roles (Theirs - вливаемая ветка)
```

---

## 2. Стратегия семантического слияния

1. **Анализ цели изменений**:
   - Что изменилось в `HEAD`? (например, багфикс или рефакторинг).
   - Что изменилось во входящей ветке? (например, добавление нового параметра `includeRoles`).
2. **Объединение логики**:
   - Нельзя бездумно выбирать `accept current` или `accept incoming`.
   - Нужно объединить обе модификации:
     ```typescript
     export function getUser(id: string, includeRoles = false): Promise<UserWithRoles> {
       return db.users.findUnique({ where: { id }, include: { roles: includeRoles } });
     }
     ```
3. **Обязательная компиляция и тесты**:
   - После удаления маркеров конфликта запустить `npm test` / `dotnet test`.

---
## 3. Ловушка `git rebase`: ours/theirs инвертированы

При `rebase` маркеры меняются местами: `HEAD` (ours) — это **вливаемая** ветка, а theirs — **твоя текущая** работа. Перед `accept current/incoming` проверь `git status` (строка вида `rebase in progress; onto <base>`) и не переноси привычки из merge.

Аварийный выход, если разрешение пошло не так:
```bash
git merge --abort    # откат незавершённого merge
git rebase --abort   # откат незавершённого rebase
```

---

## 4. Чек-лист разрешения конфликтов

- [ ] Все маркеры (`<<<<<<<`, `=======`, `>>>>>>>`) полностью удалены
- [ ] Сохранены полезные изменения обеих веток
- [ ] Проект успешно компилируется
- [ ] Пройдены все тесты и `npm run validate:all`
