---
description: "Продвинутый оптимизатор промптов: исследовательские паттерны + токен-эффективность + 100% сохранение смысла"
---

<target_file> $ARGUMENTS </target_file>

# Prompt Optimizer | Команда /prompt-optimizer

## Назначение

Команда оптимизирует промпт-файл (агент, команда, workflow) для:
- лучшей исполнимости критичных правил,
- меньшего расхода токенов,
- сохранения 100% исходного смысла.

## Вход

- `$ARGUMENTS` — путь к целевому файлу промпта (обязателен).

## Пример

```
/prompt-optimizer agent/core/openagent.md
```

## Critical Rules

<critical_rules priority="absolute" enforcement="strict">
  <rule id="approval_gate" scope="write_edit">Перед любым write/edit запросить подтверждение пользователя</rule>
  <rule id="backup_prompt" scope="apply_changes">Перед записью спросить про бэкап; при согласии сохранить копию с расширением .mds</rule>
  <rule id="stop_on_error" scope="validation">При ошибке остановиться, сообщить и запросить одобрение исправления</rule>
  <rule id="context_index" scope="write_edit">Перед изменениями загрузить context/index.md и профильные стандарты</rule>
  <rule id="semantic_preservation" scope="optimization">Сохранить 100% смысла и доменной точности</rule>
  <rule id="token_reduction" scope="optimization">Цель: 30-50% сокращения токенов</rule>
  <rule id="critical_position" scope="structure">Критичные правила должны быть в первых 15% промпта</rule>
  <rule id="nesting_limit" scope="structure">Макс. глубина вложенности: 4 уровня</rule>
  <rule id="instruction_ratio" scope="structure">Инструкции должны занимать 40-50% объема</rule>
  <rule id="single_source" scope="structure">Каждое правило определяется один раз и дальше только @ссылки</rule>
  <rule id="readability" scope="quality">Краткость без потери ясности и точности терминов</rule>
</critical_rules>

<context>
  <system>Оптимизация промптов на базе исследовательских паттернов и практик экономии токенов</system>
  <scope>Файлы в agent/, command/, .agent/workflows/</scope>
  <task>Проанализировать, оптимизировать, выдать отчет и финальный промпт</task>
</context>

<execution_priority>
  <tier level="1" desc="Research-backed">@critical_position | @nesting_limit | @instruction_ratio | @token_reduction | @semantic_preservation</tier>
  <tier level="2" desc="Structure">Порядок компонентов, приоритеты, модульность, @single_source</tier>
  <tier level="3" desc="Enhancements">Улучшение workflow, отчетность, валидация</tier>
  <conflict_resolution>Tier 1 всегда выше Tier 2/3</conflict_resolution>
</execution_priority>

## Workflow

<workflow>
  <stage id="1" name="ValidateInput" required="true">
    - Если $ARGUMENTS отсутствует: попроси путь и остановись.
    - Прочитай файл и определи тип: agent | command | workflow | context.
  </stage>

  <stage id="2" name="AnalyzeStructure">
    - Оцени: позицию critical rules, глубину вложенности, ratio инструкций, повторы, модульность.
    - Зафиксируй baseline: строки, слова, оценка токенов.
    - Выдай нарушения: CRITICAL | MAJOR | MINOR.
    - Оцени сложность: simple | moderate | complex.
  </stage>

  <stage id="3" name="ElevateCriticalRules">
    - Вынеси критичные правила в первые 15%.
    - Присвой id и замени повторы на @ссылки.
  </stage>

  <stage id="4" name="FlattenNesting">
    - Сократи вложенность до 4 уровней.
    - Перенеси метаданные в атрибуты, избегай глубоких деревьев.
  </stage>

  <stage id="5" name="OptimizeTokens">
    - Применяй техники: → для последовательности, | для альтернатив, @ для ссылок.
    - Допустимые сокращения: req, ctx, exec, ops, cfg, env, fn, info.
    - Inline mapping: key→value | key2→value2 (до 3-4 элементов).
    - Удаляй дубли и лишние слова, не сокращай критичные термины.
  </stage>

  <stage id="6" name="OptimizeInstructionRatio">
    - Если инструкций >60%: предложи вынести подробности в отдельные файлы.
    - Новые файлы создавать только после @approval_gate.
  </stage>

  <stage id="7" name="ConsolidateRepetition">
    - Оставь единый источник правил и замени повторы на @ссылки.
  </stage>

  <stage id="8" name="AddExplicitPriority">
    - Добавь 3 уровня приоритетов и конфликт-резолюцию.
  </stage>

  <stage id="9" name="StandardizeFormatting">
    - Нормализуй атрибуты: id→name→type→when→required→enforce→other.
  </stage>

  <stage id="10" name="ValidateOptimization">
    - Проверь все условия из Critical Rules.
    - Убедись, что смысл сохранен полностью.
  </stage>

  <stage id="11" name="DeliverReport">
    - Отдай отчет по метрикам и оптимизированный промпт.
    - Спроси подтверждение на запись изменений в файл.
    - Если подтверждение получено, спроси про бэкап (да/нет).
  </stage>

  <stage id="12" name="ApplyChanges" when="user_approved">
    - Если выбран бэкап: создай копию файла с расширением .mds рядом с оригиналом.
    - Обнови целевой файл и покажи краткий итог.
  </stage>
</workflow>

## Output Format

```
## Optimization Analysis

### Token Efficiency
| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Lines | X | Y | Z% |
| Words | X | Y | Z% |
| Est. tokens | X | Y | Z% |

### Research Pattern Compliance
| Pattern | Before | After | Status |
|---------|--------|-------|--------|
| Critical rules position | X% | Y% | ✅/❌ |
| Max nesting depth | X | Y | ✅/❌ |
| Instruction ratio | X% | Y% | ✅/❌ |
| Rule repetition | Xx | 1x + refs | ✅/❌ |
| Explicit prioritization | None/Exists | 3-tier | ✅/❌ |
| Token efficiency | Baseline | Z% reduction | ✅/❌ |
| Semantic preservation | N/A | 100% | ✅/❌ |

### Scores
Original: X/15 | Optimized: Y/15 | Improvement: +Z

---

## Optimized Prompt
[Полный оптимизированный промпт]
```

## Примечания

- Если файл не относится к промптам, остановись и уточни цель.
- Любые изменения файлов выполняй только после подтверждения.
- Стандарты оформления смотри в `context/core/standards/docs.md`.
