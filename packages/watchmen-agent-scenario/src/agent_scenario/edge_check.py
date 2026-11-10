import json
from typing import Any, Dict, List

from agent_scenario.http_client import ApiClient, HttpError
from agent_scenario.injector import RAW_TOPIC, inject_record, load_mock_records
from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings
from agent_scenario.verifier import Verifier, metric_column, rows_as_dicts

EDGE_REGION = 'edge'
RENAME_POLICY_ID = 'P204'
RENAME_CUSTOMER_ID = 'C903'
RENAME_OLD = 'Edge-Old'
RENAME_NEW = 'Edge-New'
# every physical table the scenario writes; all must be replayable from mock
TRUNCATE_TOPICS = [RAW_TOPIC, 'silver_policy', 'silver_customer', 'gold_policy']


def load_edge_records(settings: Settings) -> List[Dict[str, Any]]:
	data_file = settings.scenario_dir / 'data' / 'mock_policies_edge.json'
	return json.loads(data_file.read_text(encoding='utf-8'))


def truncate_all(settings: Settings, report: Report, admin_client: ApiClient,
		topics: List[str]) -> None:
	"""DELETE /topic/data/truncate for every scenario topic (drift self-heal)."""
	done: List[str] = []
	failures = 0
	for topic in topics:
		try:
			admin_client.delete('/topic/data/truncate', params={'topic_name': topic})
			done.append(topic)
		except HttpError as e:
			failures += 1
			report.record(f'truncate.{topic}', False, truncate(e))
	if failures:
		raise HttpError(f'truncate failed for {failures} topic(s); '
			f'is TRUNCATE_TOPIC_DATA enabled on the server?')
	report.record('truncate.all', True, ', '.join(done))


def run_edge_check(
		settings: Settings, report: Report, admin_client: ApiClient, runtime_cli) -> None:
	"""Edge-value semantics + non-key merge + truncate-and-replay self-heal.

	Injects the edge dataset (NULL / zero / negative premium, leap-day and
	year-end dates, an over-long unicode name, a customer rename event) into the
	distinct `edge` region, asserts the edge bucket, then truncates every
	physical table and replays the base mock so the environment ends identical
	to a plain `run`.
	"""
	edge_records = load_edge_records(settings)
	for record in edge_records:
		inject_record(admin_client, RAW_TOPIC, record)
	# rename event: same policy key, only the customer name changes (D4)
	rename_row = dict(next(r for r in edge_records if r['policy_id'] == RENAME_POLICY_ID))
	rename_row['customer_name'] = RENAME_NEW
	inject_record(admin_client, RAW_TOPIC, rename_row)
	report.record('edge.inject', True,
		f'{len(edge_records)} edge records + rename event for {RENAME_POLICY_ID}')

	# expected edge bucket computed from the edge dataset itself
	# (NULL premium is ignored by SQL aggregation; count still sees the row)
	expected_edge_sum = sum(r['premium'] for r in edge_records if r['premium'] is not None)
	expected_edge_count = len(edge_records)

	verifier = Verifier(settings, report, runtime_cli, prefix='edge')
	result = verifier.cli(['metrics', 'value', 'agent_total_premium', '--group-by', 'region'])
	rows = rows_as_dicts(result)
	edge_rows = [row for row in rows if str(row.get('region')) == EDGE_REGION]
	if len(edge_rows) != 1:
		raise AssertionError(f'edge region missing from group-by result: {truncate(rows)}')
	edge_value = metric_column(edge_rows[0], 'region')
	if edge_value is None or abs(edge_value - expected_edge_sum) > 0.01:
		raise AssertionError(
			f'edge bucket expected {expected_edge_sum} (NULL ignored), got {edge_rows[0]}')
	report.record('edge.metric_null_semantics', True,
		f'edge sum {expected_edge_sum} == {edge_value} (null premium ignored by sum)')

	# NULL-derived aggregation: C901 owns null + 0 -> derived total_premium 0
	# rename merge: C903 must carry the NEW name in silver_customer (non-key merge)
	from agent_scenario import db_check
	if db_check.db_available(settings):
		db_check.check(settings, report, 'edge.db_null_sum',
			'select coalesce(sum(premium), 0) from topic_silver_policy where customer_id = %s',
			0.0, params=('C901',), compare=lambda a, e: abs(float(a) - e) < 0.01)
		db_check.check(settings, report, 'edge.db_negative_row',
			'select premium from topic_silver_policy where policy_id = %s',
			-50, params=('P203',), compare=lambda a, e: float(a) == e)
		db_check.check(settings, report, 'edge.db_rename_merge',
			'select customer_name from topic_silver_customer where customer_id = %s',
			RENAME_NEW, params=(RENAME_CUSTOMER_ID,))
		db_check.check(settings, report, 'edge.db_leap_year_gold',
			'select count(*) from topic_gold_policy where effective_year = 2024',
			1)
		# char_length counts characters; byte length() would differ for multibyte names
		db_check.check(settings, report, 'edge.db_long_name_intact',
			'select char_length(customer_name) from topic_silver_customer where customer_id = %s',
			len(edge_records[0]['customer_name']), params=('C901',))

	# self-heal: truncate every physical table, replay base mock, re-verify
	truncate_all(settings, report, admin_client, TRUNCATE_TOPICS)
	base_records = load_mock_records(settings)
	for record in base_records:
		inject_record(admin_client, RAW_TOPIC, record)
	report.record('edge.replay', True, f'{len(base_records)} base records re-injected')

	restored = Verifier(settings, report, runtime_cli, records=base_records,
		prefix='edge.restored')
	restored.check_total_premium_by_region()
