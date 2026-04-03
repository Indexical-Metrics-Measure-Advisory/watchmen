#!/bin/bash

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." &> /dev/null && pwd )"
SKILL_SOURCE="$PROJECT_ROOT/packages/watchmen-agent-runtime-cli/skills/agent-runtime-cli/SKILL.md"
SKILL_TARGET="$PROJECT_ROOT/.trae/skills/agent-runtime-cli/SKILL.md"

echo "Installing agent-runtime-cli skill to $SKILL_TARGET..."

mkdir -p "$(dirname "$SKILL_TARGET")"

if [ -f "$SKILL_SOURCE" ]; then
    cp "$SKILL_SOURCE" "$SKILL_TARGET"
    echo "Skill definition copied successfully!"
else
    echo "Error: Skill source not found at $SKILL_SOURCE"
    exit 1
fi

echo "Ensuring agent-runtime-cli package dependencies are installed..."
cd "$PROJECT_ROOT/packages/watchmen-agent-runtime-cli" && poetry install

echo "Installation complete! The agent-runtime-cli skill is now ready to use in Trae."
