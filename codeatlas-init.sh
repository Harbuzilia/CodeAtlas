#!/bin/bash
# codeatlas-init.sh
# Initialize CodeAtlas in a new repository (required dirs and symlinks).

set -e

echo "Initializing CodeAtlas in $(pwd)..."

mkdir -p .codeatlas

GLOBAL_SKILLS_PATH="$HOME/.config/codeatlas/skills"
LOCAL_SKILLS_PATH=".codeatlas/skills"

GLOBAL_LEGACY_SKILL_PATH="$HOME/.config/codeatlas/skill"
LOCAL_LEGACY_SKILL_PATH=".codeatlas/skill"

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
GLOBAL_BIN_PATH="$HOME/.config/codeatlas/bin"
LOCAL_BIN_PATH=".codeatlas/bin"

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
    if ! grep -q "\.codeatlas/task_state\.md" .gitignore; then
        echo "" >> .gitignore
        echo "# CodeAtlas" >> .gitignore
        echo ".codeatlas/task_state.md" >> .gitignore
        echo "Added .codeatlas/task_state.md to .gitignore"
    fi
else
    echo "# CodeAtlas" > .gitignore
    echo ".codeatlas/task_state.md" >> .gitignore
    echo "Created .gitignore and added .codeatlas/task_state.md"
fi

echo "Initialization complete."
