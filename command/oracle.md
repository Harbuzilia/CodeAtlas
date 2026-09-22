---
description: Предиктивный AI-анализ вероятности дефектов и автогенерация упреждающих защитных гардов
---

# Oracle Command | Команда /oracle

## Назначение
Предсказать скрытые дефекты и сбои в коде **до того, как они произойдут**, на основе когнитивной сложности, цикломатической глубины ветвлений, связанности и энтропии изменений.

## Вход
- `/oracle` — предиктивный анализ всей кодовой базы
- `/oracle <файл/модуль>` — глубокий анализ рисков конкретного сервиса

## Автоматический режим
1. Рассчитать **Defect Probability Index (0–100%)** для каждого файла и функции.
2. Выявить скрытые архитектурные зоны риска (высокая сложность + отсутствие защитных проверок).
3. Сгенерировать **Pre-emptive Defensive Shields** (упреждающие гарды, валидации входных параметров и граничные тесты).

## Пример вывода
```
====================================================
     🔮 OPENCODE PREDICTIVE DEFECT ORACLE           
====================================================

📊 Top Risk Hotspots & Defect Probability:
| File / Module               | Complexity | Defect Risk | Status |
| :-------------------------- | :--------- | :---------- | :----- |
| src/services/billing.ts     | High (18)  | 74.2%       | ⚠️ HIGH RISK |
| src/auth/jwt.ts             | Low (3)    |  8.1%       | ✅ SAFE |

🛡️ Pre-emptive Defensive Shield Generated:
- Injected non-null assertion guard in `billing.ts:processInvoice`
- Injected boundary range check for negative amounts
- Generated preventative unit test shield
====================================================
```
