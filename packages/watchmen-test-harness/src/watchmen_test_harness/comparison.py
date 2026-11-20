from __future__ import annotations

import math
import statistics
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

from watchmen_test_harness.evaluation_models import (
	ComparisonReport,
	GateCheck,
	GatePolicy,
	MetricComparison,
	MetricPolicy,
	RunManifest,
)
from watchmen_test_harness.evaluation_store import load_manifest, resolve_manifest_path
from watchmen_test_harness.gate import changed_protected_files, evaluate_run


def _load_runs(paths: Sequence[Path]) -> List[Tuple[Path, RunManifest]]:
	return [(resolve_manifest_path(path).parent, load_manifest(path)) for path in paths]


def _metric_values(manifests: Sequence[RunManifest], name: str) -> List[float]:
	return [
		sample.value for manifest in manifests for sample in manifest.metrics
		if sample.name == name and math.isfinite(sample.value)
	]


def _compare_metric(name: str, policy: MetricPolicy, baseline: List[float], candidate: List[float]) -> MetricComparison:
	result = MetricComparison(
		name=name,
		status='skip',
		direction=policy.direction,
		max_regression_percent=policy.max_regression_percent,
		baseline_samples=baseline,
		candidate_samples=candidate,
	)
	if not baseline and not candidate:
		result.status = 'fail' if policy.required else 'skip'
		result.detail = 'required metric was not collected' if policy.required else 'metric was not collected'
		return result
	if not baseline or not candidate:
		result.status = 'fail'
		result.detail = 'metric must exist on both baseline and candidate'
		return result
	result.baseline_median = float(statistics.median(baseline))
	result.candidate_median = float(statistics.median(candidate))
	if len(baseline) < policy.min_samples or len(candidate) < policy.min_samples:
		result.status = 'fail'
		result.detail = f'at least {policy.min_samples} samples are required on each side'
		return result
	base = result.baseline_median
	candidate_value = result.candidate_median
	if base == 0:
		if candidate_value == base:
			result.change_percent = 0.0
			result.regression_percent = 0.0
			result.status = 'pass'
			result.detail = 'both medians are zero'
		else:
			result.status = 'fail'
			result.detail = 'percentage regression is undefined for a zero baseline'
		return result
	change = (candidate_value - base) / abs(base) * 100
	regression = -change if policy.direction == 'higher' else change
	result.change_percent = round(change, 4)
	result.regression_percent = round(regression, 4)
	result.status = 'pass' if regression <= policy.max_regression_percent else 'fail'
	result.detail = f'regression budget is {policy.max_regression_percent:.2f}%'
	return result


def compare_runs(
		baseline_paths: Sequence[Path],
		candidate_paths: Sequence[Path],
		policy: GatePolicy) -> ComparisonReport:
	baseline_runs = _load_runs(baseline_paths)
	candidate_runs = _load_runs(candidate_paths)
	baseline = [manifest for _, manifest in baseline_runs]
	candidate = [manifest for _, manifest in candidate_runs]
	checks: List[GateCheck] = []

	for label, runs in (('baseline', baseline_runs), ('candidate', candidate_runs)):
		invalid = []
		for run_dir, manifest in runs:
			gate = evaluate_run(manifest, run_dir, policy)
			if gate.status == 'fail':
				failed = [check.name for check in gate.checks if check.status == 'fail']
				invalid.append(f'{manifest.run_id} ({", ".join(failed)})')
		checks.append(GateCheck(
			name=f'{label}-runs-valid', status='fail' if invalid else 'pass',
			detail=f'all {label} runs satisfy the single-run gate' if not invalid
			else f'invalid {label} runs: {"; ".join(invalid)}',
		))

	for field in ('task_id', 'task_hash'):
		baseline_values = {getattr(manifest, field) for manifest in baseline}
		candidate_values = {getattr(manifest, field) for manifest in candidate}
		consistent = baseline_values == candidate_values and len(baseline_values) == 1
		checks.append(GateCheck(
			name=f'compatible-{field.replace("_", "-")}', status='pass' if consistent else 'fail',
			detail=f'{field} is identical across all runs' if consistent else f'{field} differs between runs',
			evidence={'baseline': sorted(str(value) for value in baseline_values),
				'candidate': sorted(str(value) for value in candidate_values)},
		))
	policy_hashes = {manifest.policy_hash for manifest in [*baseline, *candidate]}
	policy_compatible = len(policy_hashes) == 1 and None not in policy_hashes
	checks.append(GateCheck(
		name='compatible-policy-hash', status='pass' if policy_compatible else 'fail',
		detail='all runs used one identified policy' if policy_compatible
		else 'policy hash is missing or differs between runs',
	))

	protected_changes = sorted({
		name for manifest in candidate for name in changed_protected_files(manifest, policy.protected_paths)
	})
	checks.append(GateCheck(
		name='candidate-protected-paths', status='fail' if protected_changes else 'pass',
		detail='candidate left evaluation assets unchanged' if not protected_changes
		else f'candidate modified protected paths: {", ".join(protected_changes)}',
		evidence={'changed': protected_changes},
	))

	baseline_status = {
		suite.name: suite.status for manifest in baseline for suite in manifest.suites
	}
	new_failures = sorted({
		suite.name for manifest in candidate for suite in manifest.suites
		if suite.status in {'fail', 'error'} and baseline_status.get(suite.name) not in {'fail', 'error'}
	})
	checks.append(GateCheck(
		name='no-new-failures', status='fail' if new_failures else 'pass',
		detail='candidate introduced no new suite failures' if not new_failures
		else f'new candidate failures: {", ".join(new_failures)}',
	))

	def pass_rate(manifests: Sequence[RunManifest]) -> Tuple[int, int]:
		counted = [suite for manifest in manifests for suite in manifest.suites if suite.total]
		return sum(suite.passed or 0 for suite in counted), sum(suite.total or 0 for suite in counted)

	baseline_passed, baseline_total = pass_rate(baseline)
	candidate_passed, candidate_total = pass_rate(candidate)
	rate_regressed = bool(
		baseline_total and candidate_total
		and candidate_passed / candidate_total < baseline_passed / baseline_total
	)
	checks.append(GateCheck(
		name='pass-rate-not-regressed', status='fail' if rate_regressed else 'pass',
		detail=f'baseline={baseline_passed}/{baseline_total}, candidate={candidate_passed}/{candidate_total}',
	))

	metrics = [
		_compare_metric(name, metric_policy, _metric_values(baseline, name), _metric_values(candidate, name))
		for name, metric_policy in policy.metrics.items()
	]
	status = 'fail' if (
		any(check.status == 'fail' for check in checks)
		or any(metric.status == 'fail' for metric in metrics)
	) else 'pass'
	return ComparisonReport(
		status=status,
		baseline_runs=[manifest.run_id for manifest in baseline],
		candidate_runs=[manifest.run_id for manifest in candidate],
		checks=checks,
		metrics=metrics,
	)
