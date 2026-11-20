from watchmen_test_harness.comparison import compare_runs
from watchmen_test_harness.evaluation_models import MetricPolicy, MetricSample, SuiteResult


def metric_policy(direction='higher', min_samples=3, required=True):
	return MetricPolicy(
		direction=direction, min_samples=min_samples, required=required,
		max_regression_percent=10,
	)


def samples(name, value):
	return [MetricSample(name=name, value=value)]


def test_compare_accepts_non_regressing_candidate(run_factory, policy):
	policy.metrics = {'throughput': metric_policy('higher'), 'latency': metric_policy('lower')}
	baseline = [run_factory(f'b{index}', metrics=[
		*samples('throughput', 100), *samples('latency', 10),
	]) for index in range(3)]
	candidate = [run_factory(f'c{index}', label='candidate', metrics=[
		*samples('throughput', 105), *samples('latency', 9.5),
	]) for index in range(3)]
	report = compare_runs(baseline, candidate, policy)
	assert report.status == 'pass'
	assert all(metric.status == 'pass' for metric in report.metrics)


def test_compare_rejects_throughput_and_latency_regression(run_factory, policy):
	policy.metrics = {'throughput': metric_policy('higher'), 'latency': metric_policy('lower')}
	baseline = [run_factory(f'b{index}', metrics=[
		*samples('throughput', 100), *samples('latency', 10),
	]) for index in range(3)]
	candidate = [run_factory(f'c{index}', label='candidate', metrics=[
		*samples('throughput', 80), *samples('latency', 12),
	]) for index in range(3)]
	report = compare_runs(baseline, candidate, policy)
	assert report.status == 'fail'
	assert {metric.name for metric in report.metrics if metric.status == 'fail'} == {'throughput', 'latency'}


def test_compare_requires_enough_samples(run_factory, policy):
	policy.metrics = {'throughput': metric_policy()}
	baseline = [run_factory('b0', metrics=samples('throughput', 100))]
	candidate = [run_factory('c0', label='candidate', metrics=samples('throughput', 120))]
	report = compare_runs(baseline, candidate, policy)
	assert report.metrics[0].status == 'fail'
	assert 'at least 3 samples' in report.metrics[0].detail


def test_absent_optional_metric_does_not_block(run_factory, policy):
	policy.metrics = {'throughput': metric_policy(required=False)}
	report = compare_runs([run_factory('b0')], [run_factory('c0', label='candidate')], policy)
	assert report.status == 'pass'
	assert report.metrics[0].status == 'skip'


def test_compare_rejects_policy_hash_mismatch(run_factory, policy):
	baseline = [run_factory('b0', policy_hash='one')]
	candidate = [run_factory('c0', label='candidate', policy_hash='two')]
	report = compare_runs(baseline, candidate, policy)
	assert 'compatible-policy-hash' in {check.name for check in report.checks if check.status == 'fail'}


def test_compare_rejects_protected_candidate_change(run_factory, policy):
	baseline = [run_factory('b0')]
	candidate = [run_factory(
		'c0', label='candidate', changed_files=['packages/watchmen-test-harness/src/oracle.py'],
	)]
	report = compare_runs(baseline, candidate, policy)
	assert 'candidate-protected-paths' in {check.name for check in report.checks if check.status == 'fail'}


def test_compare_rejects_pass_rate_drop_without_suite_failure(run_factory, policy):
	baseline = [run_factory('b0')]
	candidate = [run_factory('c0', label='candidate', suites=[
		SuiteResult(name='scenarios', status='pass', total=10, passed=8, failed=0, skipped=2),
	])]
	report = compare_runs(baseline, candidate, policy)
	assert 'pass-rate-not-regressed' in {check.name for check in report.checks if check.status == 'fail'}


def test_compare_rejects_invalid_baseline(run_factory, policy):
	baseline = [run_factory('b0', suites=[SuiteResult(name='scenarios', status='fail')])]
	candidate = [run_factory('c0', label='candidate')]
	report = compare_runs(baseline, candidate, policy)
	assert 'baseline-runs-valid' in {check.name for check in report.checks if check.status == 'fail'}
