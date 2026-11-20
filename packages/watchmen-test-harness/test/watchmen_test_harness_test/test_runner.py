import json
import subprocess
import sys

from watchmen_test_harness.evaluation_models import SuiteResult
from watchmen_test_harness.evaluation_store import load_manifest
from watchmen_test_harness.runner import _junit_counts, _performance_result, _phase_scenarios, main


def test_junit_counts(tmp_path):
	path = tmp_path / 'junit.xml'
	path.write_text(
		'<testsuites><testsuite tests="4" failures="1" errors="1" skipped="1"/></testsuites>',
		encoding='utf-8',
	)
	assert _junit_counts(path) == {'total': 4, 'passed': 1, 'failed': 2, 'skipped': 1}


def test_performance_result_distinguishes_missing_and_requested(tmp_path):
	suite, metrics = _performance_result(tmp_path, requested=False)
	assert suite.status == 'skip' and suite.explicit_skip is True
	suite, _ = _performance_result(tmp_path, requested=True)
	assert suite.status == 'fail'
	(tmp_path / 'performance.json').write_text(json.dumps({
		'e2e_sec': 10, 'throughput_rps': 5.5, 'merge_sec': 2,
	}), encoding='utf-8')
	suite, metrics = _performance_result(tmp_path, requested=True)
	assert suite.status == 'pass'
	assert {metric.name for metric in metrics} == {'e2e_sec', 'throughput_rps', 'merge_sec'}


def test_scenario_runner_passes_performance_output_and_config(tmp_path, monkeypatch):
	junit = tmp_path / 'junit-scenarios.xml'

	def fake_command(command, **kwargs):
		assert kwargs['env']['WHT_PERF_OUT'] == str(tmp_path / 'performance.json')
		assert 'PIPELINE_PARALLEL_ACTIONS_IN_LOOP_UNIT' in json.loads(kwargs['env']['WHT_PERF_CONFIG'])
		junit.write_text('<testsuite tests="1" failures="0" errors="0" skipped="0"/>', encoding='utf-8')
		return subprocess.CompletedProcess(command, 0)

	monkeypatch.setattr('watchmen_test_harness.runner._run_command', fake_command)
	from watchmen_test_harness.settings import HarnessSettings
	result = _phase_scenarios(HarnessSettings(), tmp_path, 'perf')
	assert result.status == 'pass'
	assert result.total == 1


def test_runner_writes_manifest_when_first_phase_fails(tmp_path, monkeypatch):
	class FakeServer:
		def __init__(self, settings, log_dir):
			pass

		def stop(self):
			pass

	monkeypatch.setattr('watchmen_test_harness.runner.DollServerManager', FakeServer)
	monkeypatch.setattr('watchmen_test_harness.runner._phase_compose', lambda settings: (_ for _ in ()).throw(
		RuntimeError('docker unavailable'),
	))
	monkeypatch.setattr('watchmen_test_harness.runner._teardown_compose', lambda settings: None)
	monkeypatch.setattr('watchmen_test_harness.runner._revision_state', lambda base: {
		'base_revision': 'base', 'head_revision': 'head', 'dirty': False, 'changed_files': [],
	})
	exit_code = main(['run', '--suite', 'smoke', '--skip-newman', '--strict', '--results-dir', str(tmp_path)])
	assert exit_code != 0
	manifest = load_manifest(tmp_path)
	assert manifest.suite('compose').status == 'error'
	assert manifest.suite('scenarios').status == 'skip'
	assert (tmp_path / 'summary.md').is_file()
	assert (tmp_path / 'gate.json').is_file()


def test_runner_records_teardown_failure(tmp_path, monkeypatch):
	class FakeServer:
		def __init__(self, settings, log_dir):
			pass

		def start(self):
			return 'started'

		def stop(self):
			pass

	monkeypatch.setattr('watchmen_test_harness.runner.DollServerManager', FakeServer)
	monkeypatch.setattr('watchmen_test_harness.runner._phase_compose', lambda settings: 'ready')
	monkeypatch.setattr('watchmen_test_harness.runner._phase_db_scripts', lambda settings: 'ready')
	monkeypatch.setattr('watchmen_test_harness.runner._phase_scenarios', lambda *args: SuiteResult(
		name='scenarios', status='pass',
	))
	monkeypatch.setattr('watchmen_test_harness.runner._teardown_compose', lambda settings: (_ for _ in ()).throw(
		RuntimeError('cleanup failed'),
	))
	monkeypatch.setattr('watchmen_test_harness.runner._revision_state', lambda base: {
		'base_revision': 'base', 'head_revision': 'head', 'dirty': False, 'changed_files': [],
	})
	exit_code = main(['run', '--skip-newman', '--results-dir', str(tmp_path)])
	assert exit_code != 0
	assert load_manifest(tmp_path).suite('teardown').status == 'error'
