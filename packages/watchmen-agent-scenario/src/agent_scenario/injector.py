import json
from typing import Any, Dict, List

from agent_scenario.http_client import ApiClient, HttpError
from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings

RAW_TOPIC = 'raw_policy'


def load_mock_records(settings: Settings) -> List[Dict[str, Any]]:
	"""Mock records are the single source of truth for data and expected values."""
	data_file = settings.scenario_dir / 'data' / 'mock_policies.json'
	return json.loads(data_file.read_text(encoding='utf-8'))


def inject_record(admin_client: ApiClient, topic_code: str, record: Dict[str, Any]) -> Dict[str, Any]:
	"""POST one record to /pipeline/data and check the trigger receipt.

	Note the receipt only proves the data was accepted and pipelines were
	launched (they run as async tasks); actual execution success is proven by
	the verify-phase value assertions.
	"""
	result = admin_client.post('/pipeline/data', {'code': topic_code, 'data': record})
	if not result.get('received'):
		raise HttpError(f'trigger not received for {record.get("policy_id")}: {truncate(result)}')
	if not str(result.get('internalDataId') or '').strip():
		raise HttpError(f'trigger returned no internalDataId for {record.get("policy_id")}')
	return result


def inject_mock_data(settings: Settings, report: Report, admin_client: ApiClient) -> List[Dict[str, Any]]:
	"""POST every mock record to /pipeline/data, synchronously triggering pipelines."""
	records = load_mock_records(settings)
	results: List[Dict[str, Any]] = []
	failures = 0
	for record in records:
		try:
			inject_record(admin_client, RAW_TOPIC, record)
			results.append({'policyId': record['policy_id'], 'ok': True})
		except HttpError as e:
			failures += 1
			results.append({'policyId': record['policy_id'], 'ok': False, 'error': truncate(e)})
	report.record(
		'inject.mock_data', failures == 0,
		f'{len(records) - failures}/{len(records)} records accepted' if failures else
		f'all {len(records)} records accepted')
	if failures:
		for result in results:
			if not result['ok']:
				print(f'  record {result["policyId"]}: {result.get("error")}')
	return results
