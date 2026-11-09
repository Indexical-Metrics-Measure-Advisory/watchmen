from __future__ import annotations

import math
from pathlib import Path
from typing import List, Optional

from watchmen_test_harness.evaluation_models import (
	GateCheck,
	GatePolicy,
	GateResult,
	RunManifest,
	TaskDefinition,
)


def changed_protected_files(manifest: RunManifest, protected_paths: List[str]) -> List[str]:
	return [
		name for name in manifest.changed_files
		if any(name == path or name.startswith(path.rstrip('/') + '/') for path in protected_paths)
	]


def evaluate_run(
		manifest: RunManifest,
		run_dir: Path,
		policy: GatePolicy,
		task: Optional[TaskDefinition] = None,
		check_protected: bool = False) -> GateResult:
	checks: List[GateCheck] = []
	complete = bool(manifest.run_id and manifest.head_revision and manifest.finished_at)
	checks.append(GateCheck(
		name='manifest-complete',
		status='pass' if complete else 'fail',
		detail='run identity, revision and finish time are present' if complete
		else 'run_id, head_revision and finished_at are required',
	))

	failed_suites = [suite.name for suite in manifest.suites if suite.status in {'fail', 'error'}]
	checks.append(GateCheck(
		name='no-suite-failures', status='fail' if failed_suites else 'pass',
		detail='no suite failed' if not failed_suites else f'failed suites: {", ".join(failed_suites)}',
	))

	required_suites = list(dict.fromkeys([*policy.required_suites, *(task.required_suites if task else [])]))
	for name in required_suites:
		suite = manifest.suite(name)
		passed = suite is not None and suite.status == 'pass'
		detail = 'required suite passed' if passed else (
			'required suite is missing' if suite is None else f'required suite status is {suite.status}'
		)
		checks.append(GateCheck(
			name=f'required-suite:{name}', status='pass' if passed else 'fail', detail=detail,
			evidence={'status': suite.status if suite else 'missing'},
		))

	allowed_skips = {*policy.allowed_skips, *(task.allowed_skips if task else [])}
	strict = bool(manifest.config.get('strict'))
	skipped_tests = {
		suite.name: suite.skipped for suite in manifest.suites
		if suite.name in required_suites and strict and (suite.skipped or 0) > 0
	}
	checks.append(GateCheck(
		name='no-required-test-skips', status='fail' if skipped_tests else 'pass',
		detail='no required test was skipped' if not skipped_tests
		else f'required suites contain skipped tests: {skipped_tests}',
	))
	for suite in manifest.suites:
		if suite.status != 'skip' or suite.name in required_suites:
			continue
		allowed = suite.name in allowed_skips and (suite.explicit_skip or not strict)
		detail = 'explicitly allowed skip' if allowed else (
			'implicit skip is forbidden in strict mode' if strict and suite.name in allowed_skips
			else f'suite [{suite.name}] is not allowed to skip'
		)
		checks.append(GateCheck(
			name=f'optional-skip:{suite.name}', status='pass' if allowed else 'fail', detail=detail,
			evidence={'explicit': suite.explicit_skip, 'strict': strict},
		))

	metric_names = {sample.name for sample in manifest.metrics if math.isfinite(sample.value)}
	required_metrics = {*(task.required_metrics if task else [])}
	required_metrics.update(name for name, metric in policy.metrics.items() if metric.required)
	for name in sorted(required_metrics):
		passed = name in metric_names
		checks.append(GateCheck(
			name=f'required-metric:{name}', status='pass' if passed else 'fail',
			detail='finite metric sample found' if passed else 'required finite metric sample is missing',
		))

	missing_artifacts = []
	for key, relative in manifest.artifacts.items():
		artifact = (run_dir / relative).resolve()
		try:
			artifact.relative_to(run_dir.resolve())
		except ValueError:
			missing_artifacts.append(f'{key}:outside-run-directory')
			continue
		if not artifact.is_file():
			missing_artifacts.append(f'{key}:{relative}')
	for required_artifact in ('run.json', 'summary.md'):
		if not (run_dir / required_artifact).is_file():
			missing_artifacts.append(required_artifact)
	checks.append(GateCheck(
		name='artifacts-present', status='fail' if missing_artifacts else 'pass',
		detail='all indexed artifacts are present' if not missing_artifacts
		else f'missing or invalid artifacts: {", ".join(missing_artifacts)}',
		evidence={'missing': missing_artifacts},
	))

	if check_protected:
		protected_paths = list(dict.fromkeys([*policy.protected_paths, *(task.protected_paths if task else [])]))
		changed = changed_protected_files(manifest, protected_paths)
		checks.append(GateCheck(
			name='protected-paths', status='fail' if changed else 'pass',
			detail='candidate did not modify evaluation code or policies' if not changed
			else f'candidate modified protected paths: {", ".join(changed)}',
			evidence={'changed': changed, 'protected': protected_paths},
		))

	return GateResult(
		run_id=manifest.run_id,
		status='fail' if any(check.status == 'fail' for check in checks) else 'pass',
		checks=checks,
	)
