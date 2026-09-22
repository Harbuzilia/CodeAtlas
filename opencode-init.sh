#!/bin/bash
# opencode-init.sh
# Initialize OpenCode in a new repository (required dirs and links).

set -e

echo "Initializing OpenCode in $(pwd)..."

mkdir -p .opencode

# Link or copy a global directory into .opencode/.
# Windows note: Git Bash without MSYS=winsymlinks:nativestrict silently makes a
# COPY on `ln -s` — a stale copy is worse than no link, so we verify the symlink
# actually materialized and fall back to a plain recursive copy.
link_or_copy() {
    local GLOBAL_PATH="$1"
    local LOCAL_PATH="$2"

    if [ ! -d "$GLOBAL_PATH" ]; then
        echo "Warning: directory not found ($GLOBAL_PATH), skipping."
        return
    fi
    if [ -e "$LOCAL_PATH" ] || [ -L "$LOCAL_PATH" ]; then
        echo "Directory or link already exists at $LOCAL_PATH"
        return
    fi
    if ln -s "$GLOBAL_PATH" "$LOCAL_PATH" 2>/dev/null && [ -L "$LOCAL_PATH" ]; then
        echo "Symlink created: $LOCAL_PATH -> $GLOBAL_PATH"
    else
        rm -rf "$LOCAL_PATH"
        cp -r "$GLOBAL_PATH" "$LOCAL_PATH"
        echo "Copied (symlink unavailable): $LOCAL_PATH <- $GLOBAL_PATH"
    fi
}

# Discoverable skills from the global config.
link_or_copy "$HOME/.config/opencode/skills" ".opencode/skills"

# Global bin directory (ast-index and other CLI tools).
link_or_copy "$HOME/.config/opencode/bin" ".opencode/bin"

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
