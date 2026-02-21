# PLANS

Практический roadmap без бюрократии.

## 1. Ближайший приоритет
1) Прогнать реальные (не synthetic) задачи через ключевые режимы:
- `fix-production-bug`
- `api-change-safe`
- `modern-design`
- `modern-backend-upgrade`
- `prepare-release-docs`

2) Зафиксировать pass/fail и узкие места по каждому режиму.

3) Доработать только повторяющиеся боли (>=3 однотипных кейса).

## 2. Улучшения по качеству результата
- Усилить шаблоны финальных ответов для:
  - incident response
  - API migration
  - release docs sync
- Проверять согласованность код/тесты/docs для каждой change-задачи.

## 3. Улучшения language skills
### Python
- Done: обновлен (human-grade protocol + modern tooling + усиленный checklist)

### TypeScript
- Done: обновлен (human-grade protocol + modern tooling + усиленный checklist)

### C#
- Done: обновлен (human-grade protocol + modern tooling + усиленный checklist)

## 4. Что не делаем без явной необходимости
- новые мета-агенты
- архитектурное раздувание
- дополнительные док-слои сверх `PROJECT_GUIDE.md` и `PLANS.md`

## 5. Технические наблюдения на будущее
- Windows path edge case: `apply_patch` может некорректно парсить абсолютные пути (`D:\...`) и давать ENOENT вида `...\\D`.
- До отдельного расследования/фикса используем для правок только `filesystem_edit_file` / `filesystem_write_file` / `filesystem_move_file`.
- Вернуться к вопросу позже: оценить, можно ли безопасно реинтегрировать `apply_patch` для Windows без риска поломок.
