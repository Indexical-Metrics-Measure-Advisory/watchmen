"""Payload template rendering helpers.

Pure-stdlib module (no locust dependency) so it can be unit-tested in isolation
and reused by both the Locust scenarios (scenarios/base.py) and the test suite.
"""
from __future__ import annotations

import json
import os
import random
import string
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PKG_ROOT = Path(__file__).resolve().parent.parent.parent
PAYLOAD_DIR = PKG_ROOT / 'payloads'
ENV_DIR = PKG_ROOT / '.env.d'


def load_env_files() -> None:
	"""Load .env.d/*.env (written by infra scripts) into os.environ."""
	try:
		from dotenv import load_dotenv  # type: ignore
	except ImportError:  # pragma: no cover - python-dotenv is optional
		return
	if not ENV_DIR.exists():
		return
	for env_file in sorted(ENV_DIR.glob('*.env')):
		load_dotenv(env_file, override=True)


def env(key: str, default: str = '') -> str:
	return os.environ.get(key, default)


def env_int(key: str, default: int) -> int:
	try:
		return int(os.environ.get(key, str(default)))
	except ValueError:
		return default


def now_iso() -> str:
	return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')


def random_id() -> str:
	"""Snowflake-ish: timestamp + random suffix, fits in a string id column."""
	return f'{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}'


def random_payload(size: int = 64) -> str:
	"""Random alphanumeric payload to avoid topic-data dedup on identical rows."""
	alphabet = string.ascii_letters + string.digits
	return ''.join(random.choice(alphabet) for _ in range(size))


def render_template(template_name: str, **overrides: Any) -> dict:
	"""Render a payloads/*.json template, substituting {{KEY}} placeholders."""
	text = (PAYLOAD_DIR / template_name).read_text()
	values: dict[str, Any] = {
		'PERF_TOPIC_CODE': env('PERF_TOPIC_CODE', 'perf_raw_topic'),
		'PERF_TENANT_ID': env('PERF_TENANT_ID', ''),
		'PERF_COLLECTOR_TABLE': env('PERF_COLLECTOR_TABLE', 'perf_table'),
		'ID': random_id(),
		'PAYLOAD': random_payload(),
		'EVENT_TIME': now_iso(),
		'START_TIME': now_iso(),
		'END_TIME': now_iso(),
	}
	values.update(overrides)
	for key, val in values.items():
		text = text.replace('{{' + key + '}}', str(val))
	return json.loads(text)
