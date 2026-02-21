#!/bin/bash
# opencode-init.sh
# Инициализация OpenCode в новом репозитории (создание нужных директорий и симлинков).

echo "Инициализация OpenCode в $(pwd)..."

# Создаем директорию .opencode, если её нет
mkdir -p .opencode

# Пути для скиллов
GLOBAL_SKILL_PATH="$HOME/.config/opencode/skill"
LOCAL_SKILL_PATH=".opencode/skill"

# Проверяем наличие глобальной директории скиллов
if [ -d "$GLOBAL_SKILL_PATH" ]; then
    if [ ! -L "$LOCAL_SKILL_PATH" ] && [ ! -d "$LOCAL_SKILL_PATH" ]; then
        echo "Создание символической ссылки для скиллов..."
        ln -s "$GLOBAL_SKILL_PATH" "$LOCAL_SKILL_PATH"
        echo "Симлинк создан: $LOCAL_SKILL_PATH -> $GLOBAL_SKILL_PATH"
    else
        echo "Директория или симлинк уже существует по пути $LOCAL_SKILL_PATH"
    fi
else
    echo "Предупреждение: Глобальная директория скиллов не найдена ($GLOBAL_SKILL_PATH)."
    echo "Убедитесь, что OpenCode установлен глобально."
fi

# Добавляем .opencode/task_state.md в .gitignore, если его там нет
if [ -f .gitignore ]; then
    if ! grep -q "\.opencode/task_state\.md" .gitignore; then
        echo "" >> .gitignore
        echo "# OpenCode" >> .gitignore
        echo ".opencode/task_state.md" >> .gitignore
        echo "Файл .opencode/task_state.md добавлен в .gitignore"
    fi
else
    echo "# OpenCode" > .gitignore
    echo ".opencode/task_state.md" >> .gitignore
    echo "Создан .gitignore и добавлен .opencode/task_state.md"
fi

echo "Инициализация завершена."
