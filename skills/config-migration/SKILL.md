---
name: config-migration
description: "Дисциплина миграций конфигурации: сначала source-of-truth корень, минимальный явный скоуп, синк в деплой-корень контролируемыми скриптами, валидация и drift-check после синка"
---

# Config Migration Skill

Use for runtime/config layout migrations.

## Discipline
1. Apply changes in source-of-truth root first.
2. Keep migration scope explicit and minimal.
3. Preserve backward compatibility when requested.
4. Sync source -> deployed root with controlled scripts.
5. Run validation and smoke checks after sync.
6. Record drift checks and unresolved mismatches.

## Required Result
- Source and deployed roots aligned for migrated scope
- Validation results reported with pass/fail reasons
- Remaining issues listed explicitly
