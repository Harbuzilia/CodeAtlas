---
description: Стартовое меню для выбора режима работы (OpenAgent/OpenCoder/Router)
---

# Menu Command | Команда /menu

## Назначение
Короткое стартовое меню вместо Tab-переключения.

## Поведение
1) Покажи меню: OpenAgent | OpenCoder | Router | Build Context System.
2) Попроси номер и краткую задачу.
3) Если номера нет -> OpenAgent.
4) Действуй по выбору:
- OpenAgent: универсальный режим.
- OpenCoder: фокус на коде и реализации.
- Router: уточни требования и направь к агенту.
- Build Context System: интерактивная генерация .opencode системы.
5) `/menu` можно вызвать повторно.

## Формат ответа
```
## Меню
1) OpenAgent — универсальный режим
2) OpenCoder — код и имплементация
3) Router — автоподбор агента
4) Build Context System — генерация .opencode системы

Напишите номер и задачу.
```
