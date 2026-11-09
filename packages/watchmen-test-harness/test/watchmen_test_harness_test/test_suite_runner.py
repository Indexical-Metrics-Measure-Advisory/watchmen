import sys

import pytest

from watchmen_test_harness.evaluation_models import TaskDefinition
from watchmen_test_harness.suite_runner import run_command_suite, run_l1_suites


def test_l1_runs_explicit_commands_and_keeps_logs(tmp_path):
	task = TaskDefinition(
		id='l1', version='1',
		l1_suites={
			'pass': [sys.executable, '-c', 'print("unit ok")'],
			'fail': [sys.executable, '-c', 'raise SystemExit(3)'],
		},
	)
	results = run_l1_suites(task, tmp_path)
	assert results['pass'].status == 'pass'
	assert results['fail'].status == 'fail'
	assert 'unit ok' in (tmp_path / 'l1-pass.log').read_text(encoding='utf-8')
	assert (tmp_path / 'summary.md').is_file()


def test_l1_rejects_empty_command_and_escaping_cwd(tmp_path):
	with pytest.raises(ValueError, match='empty command'):
		run_command_suite('empty', [], tmp_path)
	with pytest.raises(ValueError):
		run_command_suite('escape', [sys.executable, '--version'], tmp_path, cwd='..')
