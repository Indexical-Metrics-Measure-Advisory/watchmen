from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Any, Dict, Union

from pydantic import BaseModel

from watchmen_test_harness.evaluation_models import GatePolicy, RunManifest, TaskDefinition
from watchmen_test_harness.settings import package_root


SENSITIVE_KEY_PARTS = ('password', 'passwd', 'token', 'secret', 'authorization', 'credential', 'pat')


def sanitize(value: Any) -> Any:
	if isinstance(value, dict):
		return {
			key: '***REDACTED***' if any(part in key.lower() for part in SENSITIVE_KEY_PARTS) else sanitize(item)
			for key, item in value.items()
		}
	if isinstance(value, list):
		return [sanitize(item) for item in value]
	return value


def write_json(path: Path, value: Union[BaseModel, Dict[str, Any]]) -> Path:
	path.parent.mkdir(parents=True, exist_ok=True)
	payload = value.model_dump(mode='json') if isinstance(value, BaseModel) else value
	temporary = path.with_name(f'.{path.name}.{os.getpid()}.tmp')
	temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
	temporary.replace(path)
	return path


def read_json(path: Path) -> Any:
	return json.loads(path.read_text(encoding='utf-8'))


def sha256_file(path: Path) -> str:
	digest = hashlib.sha256()
	with path.open('rb') as handle:
		for chunk in iter(lambda: handle.read(1024 * 1024), b''):
			digest.update(chunk)
	return digest.hexdigest()


def resolve_manifest_path(path: Path) -> Path:
	return path / 'run.json' if path.is_dir() else path


def load_manifest(path: Path) -> RunManifest:
	return RunManifest.model_validate(read_json(resolve_manifest_path(path)))


def _resolve_named_file(value: str, category: str) -> Path:
	candidate = Path(value)
	if candidate.is_file():
		return candidate.resolve()
	if candidate.name == value:
		candidate = package_root() / 'evaluation' / category / f'{value.removesuffix(".json")}.json'
	if not candidate.is_file():
		raise FileNotFoundError(f'{category[:-1]} not found: {value}')
	return candidate.resolve()


def load_task(value: str) -> tuple[TaskDefinition, Path]:
	path = _resolve_named_file(value, 'tasks')
	return TaskDefinition.model_validate(read_json(path)), path


def load_policy(value: str = 'default') -> tuple[GatePolicy, Path]:
	path = _resolve_named_file(value, 'policies')
	return GatePolicy.model_validate(read_json(path)), path


def relative_artifact(results_dir: Path, path: Path) -> str:
	try:
		return path.resolve().relative_to(results_dir.resolve()).as_posix()
	except ValueError:
		return path.name


def write_comparison_markdown(path: Path, report: BaseModel) -> Path:
	lines = [
		'# Watchmen candidate comparison', '',
		f'**Result**: {report.status.upper()}', '',
		'## Checks', '',
		'| Check | Status | Detail |', '|---|---|---|',
	]
	for check in report.checks:
		lines.append(f'| {check.name} | {check.status.upper()} | {check.detail} |')
	lines += [
		'', '## Metrics', '',
		'| Metric | Baseline median | Candidate median | Change | Samples | Status |',
		'|---|---:|---:|---:|---:|---|',
	]
	for metric in report.metrics:
		baseline = 'n/a' if metric.baseline_median is None else f'{metric.baseline_median:.4g}'
		candidate = 'n/a' if metric.candidate_median is None else f'{metric.candidate_median:.4g}'
		change = 'n/a' if metric.change_percent is None else f'{metric.change_percent:+.2f}%'
		samples = f'{len(metric.baseline_samples)}/{len(metric.candidate_samples)}'
		lines.append(
			f'| {metric.name} | {baseline} | {candidate} | {change} | {samples} | {metric.status.upper()} |'
		)
	path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
	return path
