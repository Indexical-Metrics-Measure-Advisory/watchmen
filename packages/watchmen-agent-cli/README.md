# Watchmen Agent CLI

A powerful CLI tool to synchronize Topics, Pipelines, and Enums between your local vault and a Watchmen server.

## Installation

### 1. Install the CLI Package
Ensure you have [Poetry](https://python-poetry.org/) installed.
```bash
cd packages/watchmen-agent-cli
poetry install
```

### 2. Install the Trae Skill (Recommended)
This makes the CLI available as a "Skill" within Trae, allowing the AI to help you manage synchronization tasks more efficiently.
```bash
./scripts/install-skill.sh
```

## Quick Start

1.  **Initialize your vault**:
    ```bash
    poetry run agent-cli init --vault ./my_vault --host <WATCHMEN_HOST> --pat <YOUR_PAT>
    ```

2.  **Pull all data**:
    ```bash
    poetry run agent-cli pull --target all --vault ./my_vault
    ```

3.  **Push changes**:
    ```bash
    poetry run agent-cli push --target topic --vault ./my_vault
    ```

## Skill Integration
Once the skill is installed, Trae's AI can automatically invoke these commands for you. It understands the dependency chain:
- **Pipeline** → **Topic**
- **Topic** → **Enum**

## Development
To contribute, check out the source code in `src/agent_cli`.
