from typing import Any, Dict, List

from agent_scenario.http_client import ApiClient
from agent_scenario.injector import RAW_TOPIC, inject_record, load_mock_records
from agent_scenario.report import Report
from agent_scenario.settings import Settings
from agent_scenario.verifier import Verifier

# the policy whose premium gets bumped to prove insert-or-merge UPDATE propagation
MERGE_TARGET_POLICY_ID = 'P101'
MERGE_DELTA = 100


def build_mutated_records(
		records: List[Dict[str, Any]], policy_id: str, delta: int) -> List[Dict[str, Any]]:
	"""Return a copy of the records with the target policy's premium shifted by delta."""
	mutated: List[Dict[str, Any]] = []
	for record in records:
		if record['policy_id'] == policy_id:
			row = dict(record)
			row['premium'] = record['premium'] + delta
			mutated.append(row)
		else:
			mutated.append(record)
	return mutated


def find_record(records: List[Dict[str, Any]], policy_id: str) -> Dict[str, Any]:
	for record in records:
		if record['policy_id'] == policy_id:
			return record
	raise ValueError(f'mock record [{policy_id}] not found')


def run_merge_check(settings: Settings, report: Report,
		admin_client: ApiClient, runtime_cli) -> None:
	"""Prove the insert-or-merge UPDATE branch end-to-end.

	Flow: inject a changed record -> full runtime assertions against the CHANGED
	expectations (every aggregate must shift accordingly) -> restore the original
	value -> assert the aggregates fell back. Leaves data identical to the mock
	file, so plain `verify` stays consistent afterwards.
	"""
	records = load_mock_records(settings)
	target = find_record(records, MERGE_TARGET_POLICY_ID)
	mutated_records = build_mutated_records(records, MERGE_TARGET_POLICY_ID, MERGE_DELTA)
	mutated = find_record(mutated_records, MERGE_TARGET_POLICY_ID)

	inject_record(admin_client, RAW_TOPIC, mutated)
	report.record('merge_check.inject', True,
		f'{MERGE_TARGET_POLICY_ID} premium {target["premium"]} -> {mutated["premium"]}')

	Verifier(settings, report, runtime_cli,
		records=mutated_records, prefix='merge_check.verify').verify_all()

	inject_record(admin_client, RAW_TOPIC, target)
	report.record('merge_check.restore', True,
		f'{MERGE_TARGET_POLICY_ID} premium back to {target["premium"]}')

	restore = Verifier(settings, report, runtime_cli, records=records,
		prefix='merge_check.restore')
	restore.check_total_premium_by_region()
