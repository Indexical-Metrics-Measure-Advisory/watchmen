import json
import time
from pathlib import Path
from typing import Any, Dict, List, Optional


class StepResult:
	def __init__(self, name: str, ok: bool, detail: str = '', elapsed_ms: int = 0) -> None:
		self.name = name
		self.ok = ok
		self.detail = detail
		self.elapsed_ms = elapsed_ms


class Report:
	"""Collects step results, prints a live one-line summary per step, and dumps JSON."""

	def __init__(self) -> None:
		self.steps: List[StepResult] = []
		self.started_at = time.strftime('%Y-%m-%dT%H:%M:%S')

	def record(self, name: str, ok: bool, detail: str = '', elapsed_ms: int = 0) -> StepResult:
		step = StepResult(name, ok, detail, elapsed_ms)
		self.steps.append(step)
		marker = 'PASS' if ok else 'FAIL'
		print(f'[{marker}] {name}' + (f' - {detail}' if detail else ''), flush=True)
		return step

	@property
	def failures(self) -> List[StepResult]:
		return [step for step in self.steps if not step.ok]

	def to_dict(self) -> Dict[str, Any]:
		return {
			'startedAt': self.started_at,
			'total': len(self.steps),
			'failed': len(self.failures),
			'steps': [
				{'name': step.name, 'ok': step.ok, 'detail': step.detail, 'elapsedMs': step.elapsed_ms}
				for step in self.steps
			],
		}

	def write(self, path: Path) -> None:
		path.parent.mkdir(parents=True, exist_ok=True)
		path.write_text(json.dumps(self.to_dict(), indent=2), encoding='utf-8')

	def print_summary(self) -> None:
		failed = len(self.failures)
		print('')
		print(f'Scenario finished: {len(self.steps) - failed} passed, {failed} failed '
			f'({self.started_at})')
		for step in self.failures:
			print(f'  FAILED: {step.name} - {step.detail}')


def truncate(text: str, limit: int = 300) -> str:
	text = ' '.join(str(text).split())
	return text if len(text) <= limit else f'{text[:limit]}...'


def optional_int(value: Any) -> Optional[int]:
	"""Best-effort int conversion used when comparing metric values."""
	if value is None:
		return None
	try:
		return int(float(value))
	except (TypeError, ValueError):
		return None
