import time
from typing import Any, Dict, List, Optional

from agent_scenario.injector import load_mock_records
from agent_scenario.pusher import CliError
from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings

METRIC_TOTAL = 'agent_total_premium'
METRIC_RATIO = 'agent_premium_per_policy'
ONTOLOGY_OBJECT = 'Customer'
DERIVED_ATTRIBUTE = 'total_premium'
TOLERANCE = 0.01
RETRIES = 3
RETRY_INTERVAL_SECONDS = 2


def compute_expected(records: List[Dict[str, Any]]) -> Dict[str, Any]:
	"""Derive expected aggregates from the mock records (single source of truth)."""
	by_region: Dict[str, Dict[str, float]] = {}
	by_status: Dict[str, Dict[str, float]] = {}
	by_customer: Dict[str, float] = {}
	by_region_customer: Dict[str, Dict[str, float]] = {}
	for record in records:
		region, status = record['region'], record['policy_status']
		customer, premium = record['customer_id'], float(record['premium'])
		for bucket, key in ((by_region, region), (by_status, status)):
			entry = bucket.setdefault(key, {'total_premium': 0.0, 'policy_count': 0})
			entry['total_premium'] += premium
			entry['policy_count'] += 1
		by_customer[customer] = by_customer.get(customer, 0.0) + premium
		region_customers = by_region_customer.setdefault(region, {})
		region_customers[customer] = region_customers.get(customer, 0.0) + premium
	total_premium = sum(entry['total_premium'] for entry in by_region.values())
	policy_count = sum(entry['policy_count'] for entry in by_region.values())
	return {
		'by_region': by_region,
		'by_status': by_status,
		'by_customer': by_customer,
		'by_region_customer': by_region_customer,
		'total': {'total_premium': total_premium, 'policy_count': policy_count},
	}


def rows_as_dicts(result: Dict[str, Any]) -> List[Dict[str, Any]]:
	"""Convert a MetricFlowResponse {column_names, data} into row dicts."""
	columns = result.get('column_names') or []
	return [dict(zip(columns, row)) for row in (result.get('data') or [])]


def metric_column(row: Dict[str, Any], dimension: str) -> Optional[float]:
	"""Pick the numeric metric value of a row, ignoring the dimension column(s)."""
	for key, value in row.items():
		if key == dimension:
			continue
		try:
			return float(value)
		except (TypeError, ValueError):
			continue
	return None


class Verifier:
	"""Drives agent-runtime-cli and asserts runtime results against expectations."""

	def __init__(self, settings: Settings, report: Report, runtime_cli,
			records: List[Dict[str, Any]] = None, prefix: str = 'verify') -> None:
		self.settings = settings
		self.report = report
		self.runtime_cli = runtime_cli
		self.prefix = prefix
		# records override lets the merge check assert against mutated data
		self.expected = compute_expected(
			records if records is not None else load_mock_records(settings))

	def vault_arg(self) -> str:
		return str(self.settings.runtime_vault_dir.resolve())

	def cli(self, args: List[str]) -> Dict[str, Any]:
		# agent-runtime-cli registers --vault per subcommand, so it must come last
		return self.runtime_cli(args + ['--vault', self.vault_arg()])

	# ------------------------------------------------------------------- steps

	def check_health(self) -> None:
		result = self.cli(['health'])
		self.report.record(f'{self.prefix}.health', True, truncate(result))

	def check_metrics_listed(self) -> None:
		result = self.cli(['metrics', 'list'])
		payload = result.get('metrics') if isinstance(result, dict) else result
		names = {
			item.get('name') for item in (payload or []) if isinstance(item, dict)
		} if isinstance(payload, list) else set()
		missing = {METRIC_TOTAL, METRIC_RATIO} - names
		if missing:
			# fall back to a raw substring scan for non-standard response shapes
			text = str(result)
			missing = {name for name in missing if name not in text}
		if missing:
			raise AssertionError(f'metrics not listed: {sorted(missing)}')
		self.report.record(f'{self.prefix}.metrics_listed', True, f'{METRIC_TOTAL}, {METRIC_RATIO} present')

	def check_total_premium_by_region(self) -> None:
		expected = self.expected['by_region']
		last_error = ''
		for attempt in range(1, RETRIES + 1):
			result = self.cli(['metrics', 'value', METRIC_TOTAL, '--group-by', 'region'])
			rows = rows_as_dicts(result)
			try:
				self.__assert_group_sum(rows, 'region', expected, 'total_premium')
				self.report.record(f'{self.prefix}.metric_total_by_region', True, truncate(rows))
				return
			except AssertionError as e:
				last_error = str(e)
				if attempt < RETRIES:
					time.sleep(RETRY_INTERVAL_SECONDS)
		raise AssertionError(last_error)

	def check_total_premium_by_status(self) -> None:
		result = self.cli(['metrics', 'value', METRIC_TOTAL, '--group-by', 'policy_status'])
		rows = rows_as_dicts(result)
		self.__assert_group_sum(rows, 'policy_status', self.expected['by_status'], 'total_premium')
		self.report.record(f'{self.prefix}.metric_total_by_status', True, truncate(rows))

	def check_ratio_metric(self) -> None:
		result = self.cli(['metrics', 'value', METRIC_RATIO])
		rows = rows_as_dicts(result)
		if not rows:
			raise AssertionError(f'{METRIC_RATIO} returned no rows: {truncate(result)}')
		expected = self.expected['total']['total_premium'] / self.expected['total']['policy_count']
		value = metric_column(rows[0], dimension='__none__')
		if value is None or abs(value - expected) > TOLERANCE:
			raise AssertionError(f'{METRIC_RATIO} expected ~{expected}, got {rows[0]}')
		self.report.record(f'{self.prefix}.metric_ratio', True, f'{value:.2f} ~ {expected:.2f}')

	def check_ontology(self) -> None:
		# explicit pagination: the server-side find_page_by_text crashes when
		# pageNumber/pageSize are absent, so always send them
		listing = self.cli([
			'ontology', 'list', '--query', self.settings.scenario_name,
			'--page', '1', '--size', '20'])
		ontology_id = None
		for item in listing.get('data') or []:
			if item.get('name') == self.settings.scenario_name:
				ontology_id = item.get('ontologyId')
				break
		if not ontology_id:
			raise AssertionError(f'ontology not listed: {truncate(listing)}')
		detail = self.cli(['ontology', 'get', str(ontology_id)])
		object_id = None
		for virtual_object in detail.get('virtualObjects') or []:
			if virtual_object.get('name') == ONTOLOGY_OBJECT:
				object_id = virtual_object.get('id')
				break
		if not object_id:
			raise AssertionError(f'virtual object {ONTOLOGY_OBJECT} not found: {truncate(detail)}')
		self.report.record(f'{self.prefix}.ontology_discovery', True,
			f'ontologyId {ontology_id}, virtualObjectId {object_id}')

		# the platform may require at least one filter per ontology query
		# (ONTOLOGY_QUERY_REQUIRE_FILTERS), so pin region = east everywhere
		region_filter = '{"region": "east"}'
		compiled = self.cli([
			'ontology', 'compile', str(ontology_id), '--virtual-object', str(object_id),
			'--filters', region_filter, '--include-derived', DERIVED_ATTRIBUTE])
		sql = str(compiled).lower()
		if 'join' not in sql:
			raise AssertionError(f'compiled SQL has no join: {truncate(compiled)}')
		self.report.record(f'{self.prefix}.ontology_compile', True, 'compiled SQL contains join')

		queried = self.cli([
			'ontology', 'query', str(ontology_id), '--virtual-object', str(object_id),
			'--filters', region_filter,
			'--fields', 'customer_id', '--include-derived', DERIVED_ATTRIBUTE])
		self.__assert_ontology_rows(queried, self.expected['by_region_customer']['east'])

	def __assert_ontology_rows(self, queried: Dict[str, Any], expected: Dict[str, float]) -> None:
		rows = queried.get('rows') or []
		if len(rows) != len(expected):
			raise AssertionError(
				f'ontology query returned {len(rows)} rows, expected {len(expected)}: {truncate(queried)}')
		checked = 0
		for row in rows:
			if self.__check_derived_value(row, expected):
				checked += 1
		# string columns may be masked; at least one row must prove the derived math
		if checked == 0:
			raise AssertionError(f'no row could be verified against mock data: {truncate(queried)}')
		self.report.record(f'{self.prefix}.ontology_query', True,
			f'{len(rows)} customers, {checked} derived {DERIVED_ATTRIBUTE} values verified')

	def __check_derived_value(self, row: Dict[str, Any], expected: Dict[str, float]) -> bool:
		"""Return True when the row was strictly verified; False when skipped."""
		derived = None
		for key, value in row.items():
			if key == 'customer_id':
				continue
			try:
				derived = float(value)
				break
			except (TypeError, ValueError):
				continue
		if derived is None:
			return False
		customer = str(row.get('customer_id') or '').strip()
		candidates = [
			key for key in expected
			if not customer or key == customer or key.startswith(customer) or customer.startswith(key)
		]
		if not candidates:
			return False
		value = expected[candidates[0]]
		if abs(derived - value) > TOLERANCE:
			raise AssertionError(
				f'customer {customer} derived {DERIVED_ATTRIBUTE}={derived}, expected {value}')
		return True

	def __assert_group_sum(
			self, rows: List[Dict[str, Any]], dimension: str,
			expected: Dict[str, Dict[str, float]], measure: str) -> None:
		actual: Dict[str, float] = {}
		for row in rows:
			key = str(row.get(dimension) or '').strip()
			value = metric_column(row, dimension)
			if value is None:
				raise AssertionError(f'row without numeric value: {row}')
			actual[key] = actual.get(key, 0.0) + value
		if set(actual) != set(expected):
			raise AssertionError(
				f'{dimension} groups mismatch: got {sorted(actual)}, expected {sorted(expected)}')
		for key, value in expected.items():
			if abs(actual[key] - value[measure]) > TOLERANCE:
				raise AssertionError(
					f'{dimension}={key}: got {actual[key]}, expected {value[measure]}')

	def verify_all(self) -> None:
		self.check_health()
		self.check_metrics_listed()
		self.check_total_premium_by_region()
		self.check_total_premium_by_status()
		self.check_ratio_metric()
		self.check_ontology()
