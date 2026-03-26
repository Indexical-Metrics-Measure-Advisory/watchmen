#!/bin/bash

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
# Project root is 3 levels up from scripts directory
PROJECT_ROOT="$( cd "$SCRIPT_DIR/../../.." &> /dev/null && pwd )"
SKILL_SOURCE="$PROJECT_ROOT/packages/watchmen-agent-cli/skills/agent-cli/SKILL.md"
SKILL_TARGET="$PROJECT_ROOT/.trae/skills/agent-cli/SKILL.md"

echo "Installing agent-cli skill to $SKILL_TARGET..."

# Create target directory if it doesn't exist
mkdir -p "$(dirname "$SKILL_TARGET")"

# Copy skill definition from source to target
if [ -f "$SKILL_SOURCE" ]; then
    cp "$SKILL_SOURCE" "$SKILL_TARGET"
    echo "Skill definition copied successfully!"
else
    echo "Error: Skill source not found at $SKILL_SOURCE"
    exit 1
fi

# Ensure the agent-cli package is installed
echo "Ensuring agent-cli package dependencies are installed..."
cd "$PROJECT_ROOT/packages/watchmen-agent-cli" && poetry install

echo "Installation complete! The agent-cli skill is now ready to use in Trae."
