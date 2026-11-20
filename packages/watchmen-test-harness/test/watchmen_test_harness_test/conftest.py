from datetime import datetime, timezone
from pathlib import Path

import pytest

from watchmen_test_harness.evaluation_models import GatePolicy, MetricSample, RunManifest, SuiteResult
from watchmen_test_harness.evaluation_store import write_json


@pytest.fixture
def policy() -> GatePolicy:
	return GatePolicy(
		version='1.0.0',
		required_suites=['scenarios'],
		allowed_skips=['newman', 'performance'],
		protected_paths=['packages/watchmen-test-harness/'],
	)


@pytest.fixture
def run_factory(tmp_path):
	def create(
			name: str,
			label: str = 'other',
			suites=None,
			metrics=None,
			changed_files=None,
			config=None,
			policy_hash='policy-hash',
			task_hash='task-hash') -> Path:
		run_dir = tmp_path / name
		run_dir.mkdir(parents=True, exist_ok=True)
		(run_dir / 'summary.md').write_text('# test run\n', encoding='utf-8')
		manifest = RunManifest(
			run_id=name,
			task_id='task',
			task_version='1.0.0',
			label=label,
			base_revision='base-sha',
			head_revision='head-sha',
			dirty=False,
			started_at=datetime.now(timezone.utc),
			finished_at=datetime.now(timezone.utc),
			config=config or {'strict': True},
			policy_hash=policy_hash,
			task_hash=task_hash,
			changed_files=changed_files or [],
			suites=suites if suites is not None else [
				SuiteResult(name='scenarios', status='pass', total=10, passed=10, failed=0, skipped=0),
				SuiteResult(name='newman', status='skip', required=False, explicit_skip=True),
				SuiteResult(name='performance', status='skip', required=False, explicit_skip=True),
			],
			metrics=metrics or [],
		)
		write_json(run_dir / 'run.json', manifest)
		return run_dir
	return create
