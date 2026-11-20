from __future__ import annotations

import subprocess
import time
from pathlib import Path
from typing import Dict, List

from watchmen_test_harness.evaluation_models import SuiteResult, TaskDefinition
from watchmen_test_harness.evaluation_store import relative_artifact
from watchmen_test_harness.report import write_summary
from watchmen_test_harness.settings import repo_root


def run_command_suite(
		name: str,
		command: List[str],
		results_dir: Path,
		cwd: str = '.',
		timeout_seconds: int = 3600) -> SuiteResult:
	if not command:
		raise ValueError(f'L1 suite [{name}] has an empty command')
	working_directory = (repo_root() / cwd).resolve()
	working_directory.relative_to(repo_root().resolve())
	log_path = results_dir / f'l1-{name}.log'
	started = time.perf_counter()
	try:
		result = subprocess.run(
			command, cwd=str(working_directory), capture_output=True, text=True,
			timeout=timeout_seconds, check=False,
		)
		log_path.write_text(result.stdout + result.stderr, encoding='utf-8')
		status = 'pass' if result.returncode == 0 else 'fail'
		detail = f'exit {result.returncode}'
	except subprocess.TimeoutExpired as error:
		output = error.stdout or ''
		if isinstance(output, bytes):
			output = output.decode(errors='replace')
		log_path.write_text(output + f'\nTIMEOUT after {timeout_seconds}s\n', encoding='utf-8')
		status = 'error'
		detail = f'timeout after {timeout_seconds}s'
	return SuiteResult(
		name=name,
		status=status,
		detail=detail,
		required=True,
		duration_ms=round((time.perf_counter() - started) * 1000),
		artifacts=[relative_artifact(results_dir, log_path)],
	)


def run_l1_suites(task: TaskDefinition, results_dir: Path) -> Dict[str, SuiteResult]:
	if not task.l1_suites:
		raise ValueError(f'task [{task.id}] does not define any L1 suites')
	results_dir.mkdir(parents=True, exist_ok=True)
	results: Dict[str, SuiteResult] = {}
	for name, command in task.l1_suites.items():
		results[name] = run_command_suite(name, command, results_dir)
	write_summary(results_dir, results)
	return results
