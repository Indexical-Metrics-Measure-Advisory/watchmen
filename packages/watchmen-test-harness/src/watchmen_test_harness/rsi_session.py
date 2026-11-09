from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import List, Literal, Optional

from pydantic import Field

from watchmen_test_harness.evaluation_models import ComparisonReport, EvaluationModel, TaskDefinition
from watchmen_test_harness.evaluation_store import read_json, sha256_file, write_json


class RSIAttempt(EvaluationModel):
	attempt: int
	status: Literal['pass', 'fail']
	candidate_runs: List[str]
	recorded_at: datetime


class RSISession(EvaluationModel):
	schema_version: int = 1
	session_id: str
	task_id: str
	task_version: str
	task_hash: str
	max_repairs: int
	status: Literal['active', 'awaiting_human', 'approved', 'rejected', 'failed']
	attempts: List[RSIAttempt] = Field(default_factory=list)
	reviewer: Optional[str] = None
	reviewed_at: Optional[datetime] = None


def session_file(path: Path) -> Path:
	return path / 'session.json' if path.is_dir() or not path.suffix else path


def load_session(path: Path) -> RSISession:
	return RSISession.model_validate(read_json(session_file(path)))


def create_session(path: Path, task: TaskDefinition, task_path: Path) -> RSISession:
	file = session_file(path)
	if file.exists():
		raise ValueError(f'RSI session already exists: {file}')
	session = RSISession(
		session_id=path.resolve().name if path.suffix == '' else path.stem,
		task_id=task.id,
		task_version=task.version,
		task_hash=sha256_file(task_path),
		max_repairs=task.max_repairs,
		status='active',
	)
	write_json(file, session)
	return session


def record_attempt(path: Path, comparison: ComparisonReport) -> RSISession:
	file = session_file(path)
	session = load_session(file)
	if session.status != 'active':
		raise ValueError(f'RSI session is {session.status}; no further attempts are allowed')
	attempt_number = len(session.attempts) + 1
	if attempt_number > session.max_repairs + 1:
		session.status = 'failed'
		write_json(file, session)
		raise ValueError('RSI repair budget is exhausted')
	session.attempts.append(RSIAttempt(
		attempt=attempt_number,
		status=comparison.status,
		candidate_runs=comparison.candidate_runs,
		recorded_at=datetime.now(timezone.utc),
	))
	if comparison.status == 'pass':
		session.status = 'awaiting_human'
	elif attempt_number > session.max_repairs:
		session.status = 'failed'
	write_json(file, session)
	return session


def review_session(path: Path, approved: bool, reviewer: str) -> RSISession:
	if not reviewer.strip():
		raise ValueError('reviewer is required')
	file = session_file(path)
	session = load_session(file)
	if session.status != 'awaiting_human':
		raise ValueError(f'RSI session is {session.status}; human review requires awaiting_human')
	session.status = 'approved' if approved else 'rejected'
	session.reviewer = reviewer.strip()
	session.reviewed_at = datetime.now(timezone.utc)
	write_json(file, session)
	return session
