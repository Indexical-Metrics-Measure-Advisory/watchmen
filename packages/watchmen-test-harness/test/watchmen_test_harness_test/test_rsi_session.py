import pytest

from watchmen_test_harness.evaluation_models import ComparisonReport, TaskDefinition
from watchmen_test_harness.evaluation_store import sha256_file, write_json
from watchmen_test_harness.rsi_session import create_session, record_attempt, review_session


def comparison(status):
	return ComparisonReport(status=status, baseline_runs=['b'], candidate_runs=['c'])


def task_file(tmp_path):
	path = tmp_path / 'task.json'
	write_json(path, TaskDefinition(id='task', version='1.0.0', max_repairs=2))
	return path


def test_rsi_session_enforces_repair_budget(tmp_path):
	path = task_file(tmp_path)
	task, _ = TaskDefinition.model_validate_json(path.read_text()), path
	session_dir = tmp_path / 'session'
	create_session(session_dir, task, path)
	record_attempt(session_dir, comparison('fail'))
	record_attempt(session_dir, comparison('fail'))
	session = record_attempt(session_dir, comparison('fail'))
	assert session.status == 'failed'
	assert len(session.attempts) == 3
	with pytest.raises(ValueError, match='failed'):
		record_attempt(session_dir, comparison('pass'))


def test_rsi_pass_waits_for_human_review(tmp_path):
	path = task_file(tmp_path)
	task = TaskDefinition.model_validate_json(path.read_text())
	session_dir = tmp_path / 'session'
	session = create_session(session_dir, task, path)
	assert session.task_hash == sha256_file(path)
	session = record_attempt(session_dir, comparison('pass'))
	assert session.status == 'awaiting_human'
	session = review_session(session_dir, approved=True, reviewer='reviewer')
	assert session.status == 'approved'
	assert session.reviewer == 'reviewer'
	with pytest.raises(ValueError, match='approved'):
		record_attempt(session_dir, comparison('pass'))


def test_rsi_rejection_and_empty_reviewer(tmp_path):
	path = task_file(tmp_path)
	task = TaskDefinition.model_validate_json(path.read_text())
	session_dir = tmp_path / 'session'
	create_session(session_dir, task, path)
	record_attempt(session_dir, comparison('pass'))
	with pytest.raises(ValueError, match='reviewer'):
		review_session(session_dir, approved=False, reviewer=' ')
	session = review_session(session_dir, approved=False, reviewer='reviewer')
	assert session.status == 'rejected'
