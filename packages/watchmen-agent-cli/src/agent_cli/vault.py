from __future__ import annotations

import json
import yaml
from pathlib import Path
from typing import Any, Dict, Iterable, List

from agent_cli.exceptions import ConfigException

VAULT_META_DIR = ".agent-cli"
CONFIG_FILE = "config.json"
TOPIC_DIR = "topics"
PIPELINE_DIR = "pipelines"


def ensure_vault(vault_path: Path) -> None:
    vault_path.mkdir(parents=True, exist_ok=True)
    (vault_path / VAULT_META_DIR).mkdir(parents=True, exist_ok=True)
    (vault_path / TOPIC_DIR).mkdir(parents=True, exist_ok=True)
    (vault_path / PIPELINE_DIR).mkdir(parents=True, exist_ok=True)


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


def write_entities(
    vault_path: Path,
    entity_dir_name: str,
    entities: List[Dict[str, Any]],
    id_key: str,
    name_key: str | None = None,
) -> int:
    ensure_vault(vault_path)
    entity_dir = vault_path / entity_dir_name
    entity_dir.mkdir(parents=True, exist_ok=True)
    for entity in entities:
        entity_id = sanitize_file_name(str(entity[id_key]))
        if name_key and entity.get(name_key):
            entity_name = sanitize_file_name(str(entity[name_key]))
            file_name = f"{entity_name}__{entity_id}.json"
        else:
            file_name = f"{entity_id}.json"
        (entity_dir / file_name).write_text(
            json.dumps(entity, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    return len(entities)


def read_entities(vault_path: Path, entity_dir_name: str) -> List[Dict[str, Any]]:
    entity_dir = vault_path / entity_dir_name
    if not entity_dir.exists():
        return []
    entities: List[Dict[str, Any]] = []
    for file_path in sorted(entity_dir.glob("*.json")):
        payload = json.loads(file_path.read_text(encoding="utf-8"))
        entities.append(payload)
    return entities


def write_yaml_entity(
    vault_path: Path,
    entity_dir_name: str,
    entity_yaml_str: str,
    id_key: str,
    name_key: str | None = None,
) -> None:
    ensure_vault(vault_path)
    entity_dir = vault_path / entity_dir_name
    entity_dir.mkdir(parents=True, exist_ok=True)
    
    entity = yaml.safe_load(entity_yaml_str)
    if not entity or not entity.get(id_key):
        return

    entity_id = sanitize_file_name(str(entity[id_key]))
    if name_key and entity.get(name_key):
        entity_name = sanitize_file_name(str(entity[name_key]))
        file_name = f"{entity_name}__{entity_id}.yml"
    else:
        file_name = f"{entity_id}.yml"
        
    (entity_dir / file_name).write_text(entity_yaml_str, encoding="utf-8")


def read_yaml_entities(vault_path: Path, entity_dir_name: str) -> List[str]:
    entity_dir = vault_path / entity_dir_name
    if not entity_dir.exists():
        return []
    entities: List[str] = []
    for file_path in sorted(entity_dir.glob("*.yml")) + sorted(entity_dir.glob("*.yaml")):
        entities.append(file_path.read_text(encoding="utf-8"))
    return entities


def sanitize_file_name(name: str) -> str:
    translated = name.translate(str.maketrans({"/": "_", "\\": "_", ":": "_", "*": "_", "?": "_", "\"": "_", "<": "_", ">": "_", "|": "_"}))
    return translated.strip() or "untitled"


def list_local_files(vault_path: Path, entity_dir_name: str) -> Iterable[Path]:
    entity_dir = vault_path / entity_dir_name
    if not entity_dir.exists():
        return []
    return sorted(entity_dir.glob("*.json")) + sorted(entity_dir.glob("*.yml")) + sorted(entity_dir.glob("*.yaml"))
