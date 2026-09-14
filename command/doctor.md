---
description: Комплексная 360° диагностика окружения агентов, валидности манифестов, путей и целостности ссылок
---

# Doctor Command | Команда /doctor

## Назначение
Проверить здоровье и работоспособность мультиагентной среды: валидность JSON-конфигураций (`opencode.json`, `registry.json`), существование всех файлов субагентов, целостность Junctions-ссылок и готовность Git/Node.js окружения.

## Вход
- `/doctor` — полная диагностика системы
- `/doctor --fix` — автоматическое исправление обнаруженных проблем (восстановление ссылок, форматирование)

## Пример вывода
```
====================================================
        🩺 OPENCODE AI ENVIRONMENT DOCTOR           
====================================================

✅ Node.js Runtime     : v20.14.0 (>= 18.0.0 required)
✅ Git Configuration   : Installed & Configured
✅ Agent Manifests     : 12/12 agent files present
✅ Skills Inventory    : 36/36 skills verified
✅ Target Junctions    : .opencode/ links intact
✅ Quality Gate Health : 100% Operational

🎉 All systems are 100% healthy and ready for autonomous agent execution!
====================================================
```
