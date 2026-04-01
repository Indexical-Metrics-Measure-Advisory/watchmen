from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict

from agent_runtime_cli.exceptions import ConfigException

VAULT_META_DIR = ".agent-runtime-cli"
CONFIG_FILE = "config.json"


def ensure_vault(vault_path: Path) -> None:
    vault_path.mkdir(parents=True, exist_ok=True)
    (vault_path / VAULT_META_DIR).mkdir(parents=True, exist_ok=True)


def config_path(vault_path: Path) -> Path:
    return vault_path / VAULT_META_DIR / CONFIG_FILE


def save_config(vault_path: Path, config: Dict[str, Any]) -> None:
    ensure_vault(vault_path)
    config_path(vault_path).write_text(
        json.dumps(config, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_config(vault_path: Path) -> Dict[str, Any]:
    path = config_path(vault_path)
    if not path.exists():
        raise ConfigException(f"Vault config not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))
