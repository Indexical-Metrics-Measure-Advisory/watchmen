from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from agent_runtime_cli.vault import VAULT_META_DIR

QUERY_LOG_FILE = "query-log.jsonl"


def query_log_path(vault_path: Path) -> Path:
    return vault_path / VAULT_META_DIR / QUERY_LOG_FILE


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def append_query_log(vault_path: Path, entry: Dict[str, Any]) -> None:
    path = query_log_path(vault_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")


def read_query_log(
    vault_path: Path,
    correlation_id: Optional[str] = None,
    limit: Optional[int] = None,
) -> List[Dict[str, Any]]:
    path = query_log_path(vault_path)
    if not path.exists():
        return []
    entries: List[Dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if correlation_id and entry.get("correlationId") != correlation_id:
            continue
        entries.append(entry)
    if limit is not None and limit >= 0:
        entries = entries[-limit:]
    return entries


def summarize_result(result: Any) -> Dict[str, Any]:
    if isinstance(result, list):
        return {"type": "list", "count": len(result)}
    if isinstance(result, dict):
        return {"type": "dict", "keys": list(result.keys())[:20]}
    if isinstance(result, str):
        return {"type": "text", "length": len(result)}
    return {"type": type(result).__name__}
