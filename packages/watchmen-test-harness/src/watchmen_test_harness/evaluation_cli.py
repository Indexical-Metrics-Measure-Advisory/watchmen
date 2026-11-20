from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from watchmen_test_harness.comparison import compare_runs
from watchmen_test_harness.evaluation_models import ComparisonReport, GatePolicy, TaskDefinition
from watchmen_test_harness.evaluation_store import (
	load_manifest,
	load_policy,
	load_task,
	read_json,
	resolve_manifest_path,
	write_comparison_markdown,
	write_json,
)
from watchmen_test_harness.gate import evaluate_run
from watchmen_test_harness.rsi_session import create_session, record_attempt, review_session
from watchmen_test_harness.suite_runner import run_l1_suites


def _print(value) -> None:
	payload = value.model_dump(mode='json') if hasattr(value, 'model_dump') else value
	print(json.dumps(payload, ensure_ascii=False, indent=2))


def _gate(args) -> int:
	manifest_path = resolve_manifest_path(Path(args.run_dir))
	run_dir = manifest_path.parent
	manifest = load_manifest(manifest_path)
	if args.policy:
		policy, _ = load_policy(args.policy)
	elif (run_dir / 'policy.json').is_file():
		policy = GatePolicy.model_validate(read_json(run_dir / 'policy.json'))
	else:
		policy, _ = load_policy()
	task = None
	if args.task:
		task, _ = load_task(args.task)
	elif (run_dir / 'task.json').is_file():
		task = TaskDefinition.model_validate(read_json(run_dir / 'task.json'))
	elif manifest.task_id:
		task, _ = load_task(manifest.task_id)
	result = evaluate_run(
		manifest, run_dir, policy, task=task,
		check_protected=args.check_protected or manifest.label == 'candidate',
	)
	write_json(run_dir / 'gate.json', result)
	_print(result)
	return 0 if result.status == 'pass' else 1


def _compare(args) -> int:
	policy, _ = load_policy(args.policy)
	report = compare_runs([Path(path) for path in args.baseline], [Path(path) for path in args.candidate], policy)
	output_dir = Path(args.output_dir) if args.output_dir else Path.cwd() / (
		f'comparison-{datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")}'
	)
	output_dir.mkdir(parents=True, exist_ok=True)
	write_json(output_dir / 'comparison.json', report)
	write_comparison_markdown(output_dir / 'comparison.md', report)
	_print(report)
	print(f'[wht] comparison reports in {output_dir}')
	return 0 if report.status == 'pass' else 1


def _rsi_create(args) -> int:
	task, task_path = load_task(args.task)
	_print(create_session(Path(args.session_dir), task, task_path))
	return 0


def _rsi_record(args) -> int:
	comparison = ComparisonReport.model_validate(read_json(Path(args.comparison)))
	_print(record_attempt(Path(args.session_dir), comparison))
	return 0


def _rsi_review(args) -> int:
	_print(review_session(Path(args.session_dir), args.approve, args.reviewer))
	return 0


def _l1(args) -> int:
	task, _ = load_task(args.task)
	results = run_l1_suites(task, Path(args.results_dir))
	write_json(Path(args.results_dir) / 'l1.json', {
		'taskId': task.id,
		'suites': [suite.model_dump(mode='json') for suite in results.values()],
	})
	_print({'taskId': task.id, 'status': 'fail' if any(
		suite.status in {'fail', 'error'} for suite in results.values()
	) else 'pass'})
	return 1 if any(suite.status in {'fail', 'error'} for suite in results.values()) else 0


def register_evaluation_commands(subparsers) -> None:
	l1_parser = subparsers.add_parser('l1', help='run explicit package-level commands from a task')
	l1_parser.add_argument('--task', required=True)
	l1_parser.add_argument('--results-dir', required=True)
	l1_parser.set_defaults(handler=_l1)

	gate_parser = subparsers.add_parser('gate', help='validate one structured run manifest')
	gate_parser.add_argument('run_dir')
	gate_parser.add_argument('--policy', default=None)
	gate_parser.add_argument('--task', default=None)
	gate_parser.add_argument('--check-protected', action='store_true')
	gate_parser.set_defaults(handler=_gate)

	compare_parser = subparsers.add_parser('compare', help='compare baseline and candidate run sets')
	compare_parser.add_argument('--baseline', nargs='+', required=True)
	compare_parser.add_argument('--candidate', nargs='+', required=True)
	compare_parser.add_argument('--policy', default='default')
	compare_parser.add_argument('--output-dir', default=None)
	compare_parser.set_defaults(handler=_compare)

	rsi_parser = subparsers.add_parser('rsi', help='auditable, human-promoted RSI evaluation sessions')
	rsi_subparsers = rsi_parser.add_subparsers(dest='rsi_command', required=True)
	create_parser = rsi_subparsers.add_parser('create')
	create_parser.add_argument('session_dir')
	create_parser.add_argument('--task', required=True)
	create_parser.set_defaults(handler=_rsi_create)
	record_parser = rsi_subparsers.add_parser('record')
	record_parser.add_argument('session_dir')
	record_parser.add_argument('comparison')
	record_parser.set_defaults(handler=_rsi_record)
	review_parser = rsi_subparsers.add_parser('review')
	review_parser.add_argument('session_dir')
	review_parser.add_argument('--reviewer', required=True)
	approval = review_parser.add_mutually_exclusive_group(required=True)
	approval.add_argument('--approve', action='store_true')
	approval.add_argument('--reject', action='store_false', dest='approve')
	review_parser.set_defaults(handler=_rsi_review)
