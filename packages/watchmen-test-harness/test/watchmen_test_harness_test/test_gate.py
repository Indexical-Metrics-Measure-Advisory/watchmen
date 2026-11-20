from watchmen_test_harness.evaluation_models import MetricPolicy, MetricSample, SuiteResult, TaskDefinition
from watchmen_test_harness.evaluation_store import load_manifest, load_policy, load_task, sanitize, write_json
from watchmen_test_harness.gate import evaluate_run


def failed_checks(result):
	return {check.name for check in result.checks if check.status == 'fail'}


def test_explicit_allowed_skip_passes_in_strict_mode(run_factory, policy):
	manifest = load_manifest(run_factory('run'))
	assert evaluate_run(manifest, run_factory('run'), policy).status == 'pass'


def test_implicit_skip_fails_in_strict_mode(run_factory, policy):
	run_dir = run_factory('run', suites=[
		SuiteResult(name='scenarios', status='pass'),
		SuiteResult(name='newman', status='skip', required=False, explicit_skip=False),
	])
	result = evaluate_run(load_manifest(run_dir), run_dir, policy)
	assert 'optional-skip:newman' in failed_checks(result)


def test_required_skip_and_optional_failure_are_not_green(run_factory, policy):
	run_dir = run_factory('run', suites=[
		SuiteResult(name='scenarios', status='skip'),
		SuiteResult(name='performance', status='fail', required=False),
	])
	result = evaluate_run(load_manifest(run_dir), run_dir, policy)
	assert {'required-suite:scenarios', 'no-suite-failures'} <= failed_checks(result)


def test_missing_and_escaping_artifacts_fail(run_factory, policy):
	run_dir = run_factory('run')
	manifest = load_manifest(run_dir)
	manifest.artifacts = {'missing': 'missing.xml', 'escape': '../outside.json'}
	write_json(run_dir / 'run.json', manifest)
	result = evaluate_run(manifest, run_dir, policy)
	assert 'artifacts-present' in failed_checks(result)


def test_required_metric_must_be_finite(run_factory, policy):
	policy.metrics['throughput'] = MetricPolicy(direction='higher', required=True)
	run_dir = run_factory('run', metrics=[MetricSample(name='other', value=1)])
	result = evaluate_run(load_manifest(run_dir), run_dir, policy)
	assert 'required-metric:throughput' in failed_checks(result)


def test_candidate_cannot_modify_protected_paths(run_factory, policy):
	run_dir = run_factory(
		'candidate', label='candidate',
		changed_files=['packages/watchmen-test-harness/evaluation/policies/default.json'],
	)
	task = TaskDefinition(id='task', version='1', protected_paths=['packages/secret-oracle/'])
	result = evaluate_run(load_manifest(run_dir), run_dir, policy, task=task, check_protected=True)
	assert 'protected-paths' in failed_checks(result)


def test_sensitive_config_is_redacted_recursively():
	assert sanitize({
		'password': 'visible',
		'nested': {'accessToken': 'visible', 'normal': 'kept'},
		'items': [{'authorization': 'visible'}],
	}) == {
		'password': '***REDACTED***',
		'nested': {'accessToken': '***REDACTED***', 'normal': 'kept'},
		'items': [{'authorization': '***REDACTED***'}],
	}


def test_named_task_and_policy_accept_json_suffix():
	task, _ = load_task('mysql-smoke.json')
	policy, _ = load_policy('default.json')
	assert task.id == 'mysql-smoke'
	assert policy.version == '1.0.0'
