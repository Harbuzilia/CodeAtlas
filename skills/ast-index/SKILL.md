---
name: ast-index
description: ast-index skill reference
---

# ast-index — Быстрый AST-поиск по коду

<context>
`ast-index` — это CLI-утилита на Rust, которая строит локальную SQLite-базу из AST (Abstract Syntax Tree) всех файлов проекта.
Она поддерживает 23 языка программирования и позволяет находить символы, классы, использования и зависимости за **миллисекунды** (в 12-260x быстрее grep).

**Когда использовать вместо grep:**
- Нужно найти ВСЕ места, где вызывается конкретная функция → `ast-index usages "funcName"`
- Нужно понять иерархию наследования → `ast-index hierarchy "ClassName"`
- Нужно увидеть структуру файла (outline) → `ast-index outline "path/to/file.ts"`
- Нужно найти все реализации интерфейса → `ast-index implementations "InterfaceName"`

**Когда НЕ использовать (использовать grep):**
- Поиск по содержимому строк, комментариев или конфигов (не AST)
- Поиск по `.md`, `.json`, `.yaml` файлам (ast-index их не индексирует)
</context>

## Расположение бинарника

Бинарник хранится глобально: `~/.config/codeatlas/bin/ast-index.exe`
В каждом проекте он доступен через symlink (создаётся `codeatlas-init.sh`):

```
.codeatlas/bin/ast-index.exe
```

## Первичная настройка (один раз на проект)

```bash
# Построить индекс (выполнить из корня проекта)
.codeatlas/bin/ast-index.exe rebuild

# Обновить индекс после изменений (инкрементально, быстро)
.codeatlas/bin/ast-index.exe update
```

> **Важно:** Индекс хранится в `%LOCALAPPDATA%\ast-index\` (не в папке проекта). Первый `rebuild` занимает ~1 секунду. Последующие `update` — мгновенны.

## Основные команды

### Поиск символов
```bash
# Универсальный поиск (файлы + символы + ссылки)
.codeatlas/bin/ast-index.exe search "UserService"

# Найти класс/интерфейс
.codeatlas/bin/ast-index.exe class "AuthController"

# Найти любой символ (функцию, переменную, тип)
.codeatlas/bin/ast-index.exe symbol "handleSubmit"

# Найти файл по имени
.codeatlas/bin/ast-index.exe file "auth"
```

### Анализ использований (КЛЮЧЕВАЯ ФИЧА)
```bash
# Где используется этот символ? (за ~8ms вместо 90ms grep)
.codeatlas/bin/ast-index.exe usages "validateUser"

# Кросс-ссылки: определение + импорты + использования (одним вызовом)
.codeatlas/bin/ast-index.exe refs "UserRepository"

# Кто вызывает эту функцию?
.codeatlas/bin/ast-index.exe callers "fetchData"

# Дерево вызовов (кто вызывает вызывающих)
.codeatlas/bin/ast-index.exe call-tree "processOrder" --depth 3
```

### Навигация по структуре
```bash
# Показать все символы в файле (outline)
.codeatlas/bin/ast-index.exe outline "src/auth/login.ts"

# Иерархия класса (родители + потомки)
.codeatlas/bin/ast-index.exe hierarchy "BaseComponent"

# Найти все реализации интерфейса/абстрактного класса
.codeatlas/bin/ast-index.exe implementations "IRepository"

# Показать импорты файла
.codeatlas/bin/ast-index.exe imports "src/app.ts"
```

### Обзор проекта
```bash
# Компактная карта проекта (ключевые типы по директориям)
.codeatlas/bin/ast-index.exe map

# Статистика индекса
.codeatlas/bin/ast-index.exe stats

# Обнаружить паттерны архитектуры и фреймворки
.codeatlas/bin/ast-index.exe conventions
```

### Анализ изменений
```bash
# Какие символы изменились относительно main?
.codeatlas/bin/ast-index.exe changed

# Изменения относительно конкретной ветки
.codeatlas/bin/ast-index.exe changed --base origin/develop
```

## Правила для агентов

1. **Перед изменением подписи функции** — ОБЯЗАТЕЛЬНО выполни `usages "funcName"`, чтобы найти и обновить ВСЕ точки вызова.
2. **Перед удалением класса** — выполни `usages "ClassName"` и `hierarchy "ClassName"`, чтобы убедиться, что от него никто не зависит.
3. **Не генерируй индекс заново без необходимости.** Используй `update` (инкрементальный) вместо `rebuild` (полный).
4. **Если индекс не существует** — выполни `rebuild` один раз перед первым использованием.
5. **Этот инструмент НЕ заменяет repomap.** `repomap.txt` нужен для глобального понимания архитектуры. `ast-index` — для точечного поиска конкретных символов.
