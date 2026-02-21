---
description: "Интерактивный конструктор системы контекста для генерации полной .opencode архитектуры под домен пользователя"
---

# Build Context System | Команда /build-context-system

## Назначение
Создаёт полную контекстно-ориентированную систему (.opencode) под домен пользователя: оркестратор, субагенты, контексты, workflows и команды.

## Вход
- `$ARGUMENTS` — домен/описание (если есть)

## Обязательные правила
1. Approval gate перед любыми write/edit/task.
2. Перед генерацией загрузи стандарты:
   - Документы: `context/core/standards/docs.md`
   - Код: `context/core/standards/code.md`
   - Тесты: `context/core/standards/tests.md`
3. Memory protocol:
   - Перед началом: `ARCHITECTURE.md`, `DECISIONS.md`
   - После завершения: обнови `DECISIONS.md` при новых подходах, `ARCHITECTURE.md` при изменении структуры, `_AGENTS_MEMORY.md` всегда.
4. STOP on failure: ошибки не исправлять без approval.

<target_domain> $ARGUMENTS </target_domain>

<context>
  <system_context>Конструктор контекстных систем на базе иерархии агентов, модульных контекстов и workflow-оркестрации</system_context>
  <domain_context>Проектирование архитектуры системы, контекстов, команд и интеграций</domain_context>
  <task_context>Преобразовать требования пользователя в полный набор файлов .opencode</task_context>
  <execution_context>Интерактивное интервью + генерация системы по подтвержденной архитектуре</execution_context>
</context>

<role>Эксперт по системной архитектуре контекстных AI-систем и иерархии агентов</role>

<task>Собрать требования, сформировать архитектуру и инициировать генерацию полной .opencode системы</task>

<workflow_execution>
  <stage id="0" name="DetectExistingProject">
    <action>Определить целевой корень и существующую структуру</action>
    <process>
      1. Проверить наличие `.opencode/`
      2. Проверить наличие корневых `agent/`, `context/`, `command/`, `workflows/`
      3. Определить `target_root`:
         - Если есть `.opencode/` и корневые папки — спросить пользователя
         - Если есть только `.opencode/` — target_root = `.opencode/`
         - Если есть только корневые папки — target_root = `./`
      4. Просканировать существующие агенты, команды, контексты и workflows
      5. Зафиксировать список возможностей и предложить стратегию merge
    </process>
    <decision>
      <if test="no_existing_project">
        ## Новый проект
        Не найдена существующая система. Продолжаем с чистой генерацией.
      </if>
      <if test="existing_project_found">
        ## Найдена существующая система
        Выберите стратегию:
        - Extend: расширить существующую
        - Separate: создать отдельную систему
        - Replace: создать заново с бэкапом
        - Cancel: отменить
      </if>
    </decision>
    <checkpoint>Стратегия merge определена</checkpoint>
  </stage>

  <stage id="1" name="InitiateInterview">
    <action>Старт интервью для сбора требований</action>
    <process>
      1. Приветствие и объяснение процесса
      2. Парсинг домена из $ARGUMENTS
      3. Обозначение фаз интервью
      4. Уточнение ожиданий по результатам
    </process>
    <output_format>
      ## Построение контекстной системы
      Фазы: Домен и цель → Use cases → Сложность и масштаб → Интеграции → Подтверждение
    </output_format>
    <checkpoint>Пользователь готов к интервью</checkpoint>
  </stage>

  <stage id="2" name="GatherDomainInfo">
    <action>Сбор информации о домене и целях</action>
    <questions>
      <question_1>
        <ask>Какой домен/отрасль?</ask>
        <capture>domain_name, industry_type</capture>
      </question_1>
      <question_2>
        <ask>Основная цель системы?</ask>
        <capture>primary_purpose, automation_goals</capture>
      </question_2>
      <question_3>
        <ask>Кто основные пользователи?</ask>
        <capture>user_personas, expertise_level</capture>
      </question_3>
    </questions>
    <checkpoint>Домен и цели определены</checkpoint>
  </stage>

  <stage id="2.5" name="DetectDomainType">
    <action>Классификация домена и адаптация вопросов</action>
    <process>
      1. Анализ domain_name и primary_purpose
      2. Классификация: development | business | hybrid | other
      3. Выбор релевантных существующих агентов
      4. Адаптация дальнейших вопросов
    </process>
    <checkpoint>Тип домена определен</checkpoint>
  </stage>

  <stage id="3" name="IdentifyUseCases">
    <action>Определить ключевые use cases</action>
    <questions>
      <question_4>
        <ask>Топ 3-5 задач, которые должна решать система?</ask>
        <capture>use_cases[], task_descriptions[]</capture>
      </question_4>
      <question_5>
        <ask>Сложность каждого use case?</ask>
        <capture>complexity_map{use_case: complexity_level}</capture>
      </question_5>
      <question_6>
        <ask>Есть зависимости между задачами?</ask>
        <capture>workflow_dependencies[], task_sequences[]</capture>
      </question_6>
    </questions>
    <checkpoint>Use cases описаны</checkpoint>
  </stage>

  <stage id="4" name="AssessComplexity">
    <action>Оценить масштаб и сложность</action>
    <questions>
      <question_7>
        <ask>Сколько специализированных агентов нужно?</ask>
        <capture>estimated_agent_count, specialization_areas[]</capture>
      </question_7>
      <question_8>
        <ask>Какие типы знаний нужны?</ask>
        <capture>knowledge_types[], context_categories[]</capture>
      </question_8>
      <question_9>
        <ask>Нужна ли история/состояние?</ask>
        <capture>state_management_level, history_requirements</capture>
      </question_9>
    </questions>
    <checkpoint>Требования масштаба определены</checkpoint>
  </stage>

  <stage id="5" name="IdentifyIntegrations">
    <action>Определить интеграции и файловые операции</action>
    <questions>
      <question_10>
        <ask>Какие внешние сервисы интегрируем?</ask>
        <capture>integrations[], api_requirements[], tool_dependencies[]</capture>
      </question_10>
      <question_11>
        <ask>Какие файловые операции нужны?</ask>
        <capture>file_operations_level, storage_requirements</capture>
      </question_11>
      <question_12>
        <ask>Нужны ли slash-команды?</ask>
        <capture>custom_commands[], command_patterns[]</capture>
      </question_12>
    </questions>
    <checkpoint>Интеграции определены</checkpoint>
  </stage>

  <stage id="6" name="ReviewAndConfirm">
    <action>Сводка архитектуры и подтверждение</action>
    <process>
      1. Сводка ответов пользователя
      2. Архитектурный план
      3. Подсчет файлов и компонентов
      4. Запрос подтверждения
    </process>
    <output_format>
      ## Сводка архитектуры
      **Domain**: {domain_name}
      **Purpose**: {primary_purpose}
      **Users**: {user_personas}

      **Use Cases**:
      {for each use_case:
        - {use_case.name} (Complexity: {use_case.complexity})
      }

      **Components**:
      - Orchestrator: {domain}-orchestrator
      - Subagents: {estimated_agent_count}
      - Context files: {estimated_context_files}
      - Workflows: {workflow_count}
      - Commands: {command_count}

      Подтвердить архитектуру? (Proceed / Revise / Cancel)
    </output_format>
    <checkpoint>Архитектура подтверждена</checkpoint>
  </stage>

  <stage id="7" name="GenerateSystem">
    <action>Генерация системы</action>
    <prerequisites>Approval получен</prerequisites>
    <routing>
      <route to="meta/system-builder">
        <context_level>Level 2</context_level>
        <pass_data>
          - interview_responses
          - architecture_summary
          - component_specifications
          - file_structure_plan
          - target_root
        </pass_data>
        <expected_return>
          - complete_file_structure
          - validation_report
          - documentation
        </expected_return>
      </route>
    </routing>
    <process>
      1. Подготовить requirements документ
      2. Делегировать meta/system-builder
      3. Проверить структуру и качество
    </process>
    <checkpoint>Система сгенерирована</checkpoint>
  </stage>

  <stage id="8" name="DeliverSystem">
    <action>Выдать структуру и инструкции</action>
    <output_format>
      ## Готово
      **System**: {domain_name}
      **Location**: {target_root}

      ### Что создано
      - Agents: {agent_count}
      - Contexts: {context_count}
      - Workflows: {workflow_count}
      - Commands: {command_count}

      ### Далее
      1. Протестировать главные сценарии
      2. Уточнить контексты домена
      3. Уточнить workflows
    </output_format>
    <checkpoint>Система передана</checkpoint>
  </stage>
</workflow_execution>

<routing_intelligence>
  <analyze_request>
    <step_1>Парсинг $ARGUMENTS</step_1>
    <step_2>Определение полноты требований</step_2>
    <step_3>Оценка уровня пользователя</step_3>
  </analyze_request>
  <allocate_context>
    <level_1>Четкие требования, минимум подсказок</level_1>
    <level_2>Стандартное интервью</level_2>
    <level_3>Сложный домен, расширенное сопровождение</level_3>
  </allocate_context>
</routing_intelligence>

<validation>
  <pre_flight>
    - Пользователь понимает процесс
    - Use cases описаны
    - Стандарты загружены
  </pre_flight>
  <post_flight>
    - Структура соответствует подтвержденной архитектуре
    - Все файлы валидны
    - Документация понятна
  </post_flight>
</validation>

<quality_standards>
  <modular_design>Файлы 50-200 строк, одно назначение</modular_design>
  <hierarchical_organization>Оркестратор + специализации</hierarchical_organization>
  <context_efficiency>Уровни контекста 1/2/3</context_efficiency>
  <workflow_driven>Сначала workflows, потом агенты</workflow_driven>
</quality_standards>

<output_specifications>
  <interview_responses>Структурированные ответы пользователя</interview_responses>
  <architecture_summary>План системы с компонентами</architecture_summary>
  <generated_system>Полная структура .opencode</generated_system>
  <usage_documentation>Краткий гайд и чек-лист</usage_documentation>
</output_specifications>

## Примечание
Регистрацию команды в `opencode.json` выполнять только по запросу пользователя.