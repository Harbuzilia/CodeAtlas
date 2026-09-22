---
name: db-migration-safety
description: Стандарты безопасных Zero-Downtime миграций баз данных (Expand-Contract, non-blocking DDL, rollback scripts)
---

# Zero-Downtime Database Migration Safety Skill

<context>
Этот скилл содержит обязательные стандарты безопасной эволюции схем реляционных баз данных (PostgreSQL, MySQL, SQLite, MSSQL).
Используется агентами `coder`, `reviewer`, `architect` при любых изменениях таблиц, колонок, индексов и ограничений.
</context>

## 1. Паттерн Expand-Contract (2-фазный деплой)

При любом несовместимом изменении схемы (переименование, удаление колонки, изменение типа) запрещено делать изменение в один шаг:

```
[Phase 1: Expand]
1. Добавить новую колонку (nullable).
2. Обновить приложение: писать в ОБЕ колонки (Dual Write), читать из старой или новой.
3. Выполнить фоновый backfill старых данных в новую колонку.

[Phase 2: Contract]
4. Переключить чтение полностью на новую колонку.
5. Удалить код записи в старую колонку.
6. Удалить старую колонку отдельной миграцией через 1-2 спринта.
```

---

## 2. Безопасные DDL операции

### 2.1 Добавление NOT NULL колонки
- ❌ **Опасно** (блокирует таблицу на чтение и запись):
  ```sql
  ALTER TABLE users ADD COLUMN is_verified boolean NOT NULL DEFAULT false;
  ```
- ✅ **Безопасно** (PostgreSQL):
  ```sql
  -- 1. Добавляем nullable с default (в PG 11+ это O(1))
  ALTER TABLE users ADD COLUMN is_verified boolean DEFAULT false;
  -- 2. Заполняем существующие строки при необходимости
  -- 3. Добавляем check constraint с NOT VALID
  ALTER TABLE users ADD CONSTRAINT check_is_verified_not_null CHECK (is_verified IS NOT NULL) NOT VALID;
  -- 4. Валидируем без блокировки
  ALTER TABLE users VALIDATE CONSTRAINT check_is_verified_not_null;
  ```

### 2.2 Создание индексов
- ❌ `CREATE INDEX idx_orders_user_id ON orders (user_id);` (блокирует запись)
- ✅ `CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders (user_id);` (PostgreSQL)

### 2.3 Добавление Foreign Key
- ❌ `ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);`
- ✅ `ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) NOT VALID;`
  Затем: `ALTER TABLE orders VALIDATE CONSTRAINT fk_user;`

---

## 3. Чек-лист безопасности миграций (DB Safety Gate)

- [ ] Для каждого `UP` скрипта написан соответствующий `DOWN / Rollback` скрипт
- [ ] Индексы на больших таблицах создаются с `CONCURRENTLY`
- [ ] Отсутствуют тяжелые блокировки таблиц (`LOCK TABLE`, `ALTER TYPE`)
- [ ] Переименование/удаление колонок разбито по паттерну Expand-Contract
- [ ] Проверены планы выполнения запросов (`EXPLAIN ANALYZE`) для новых индексов
