#!/bin/bash
# opencode-init.sh
# Initialize OpenCode in a new repository (required dirs and symlinks).

set -e

echo "Initializing OpenCode in $(pwd)..."

mkdir -p .opencode

GLOBAL_SKILLS_PATH="$HOME/.config/opencode/skills"
LOCAL_SKILLS_PATH=".opencode/skills"

GLOBAL_LEGACY_SKILL_PATH="$HOME/.config/opencode/skill"
LOCAL_LEGACY_SKILL_PATH=".opencode/skill"

if [ -d "$GLOBAL_SKILLS_PATH" ]; then
    if [ ! -L "$LOCAL_SKILLS_PATH" ] && [ ! -d "$LOCAL_SKILLS_PATH" ]; then
        echo "Creating symlink for discoverable skills..."
        ln -s "$GLOBAL_SKILLS_PATH" "$LOCAL_SKILLS_PATH"
        echo "Symlink created: $LOCAL_SKILLS_PATH -> $GLOBAL_SKILLS_PATH"
    else
        echo "Directory or symlink already exists at $LOCAL_SKILLS_PATH"
    fi
else
    echo "Warning: Global skills directory not found ($GLOBAL_SKILLS_PATH)."
fi

# Link global bin directory (ast-index and other CLI tools).
GLOBAL_BIN_PATH="$HOME/.config/opencode/bin"
LOCAL_BIN_PATH=".opencode/bin"

if [ -d "$GLOBAL_BIN_PATH" ]; then
    if [ ! -L "$LOCAL_BIN_PATH" ] && [ ! -d "$LOCAL_BIN_PATH" ]; then
        echo "Creating symlink for global bin tools..."
        ln -s "$GLOBAL_BIN_PATH" "$LOCAL_BIN_PATH"
        echo "Symlink created: $LOCAL_BIN_PATH -> $GLOBAL_BIN_PATH"
    else
        echo "Directory or symlink already exists at $LOCAL_BIN_PATH"
    fi
else
    echo "Warning: Global bin directory not found ($GLOBAL_BIN_PATH)."
fi



if [ -f .gitignore ]; then
    if ! grep -q "\.opencode/task_state\.md" .gitignore; then
        echo "" >> .gitignore
        echo "# OpenCode" >> .gitignore
        echo ".opencode/task_state.md" >> .gitignore
        echo "Added .opencode/task_state.md to .gitignore"
    fi
else
    echo "# OpenCode" > .gitignore
    echo ".opencode/task_state.md" >> .gitignore
    echo "Created .gitignore and added .opencode/task_state.md"
fi

echo "Initialization complete."
