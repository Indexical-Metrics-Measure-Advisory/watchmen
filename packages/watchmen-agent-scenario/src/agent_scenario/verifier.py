import time
from typing import Any, Callable, Dict, List, Optional

from agent_scenario.injector import load_mock_records
from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings

METRIC_TOTAL = 'agent_total_premium'
METRIC_RATIO = 'agent_premium_per_policy'
ONTOLOGY_OBJECT = 'Customer'
ONTOLOGY_POLICY_OBJECT = 'Policy'
DERIVED_ATTRIBUTE = 'total_premium'
TOLERANCE = 0.01
RETRIES = 3
RETRY_INTERVAL_SECONDS = 2
HIGH_PREMIUM_THRESHOLD = 1000


def compute_expected(records: List[Dict[str, Any]]) -> Dict[str, Any]:
	"""Derive expected aggregates from the mock records (single source of truth).

	NULL premiums (edge dataset) contribute 0 to sums while still being counted,
	mirroring SQL aggregation semantics.
	"""
	by_region: Dict[str, Dict[str, float]] = {}
	by_status: Dict[str, Dict[str, float]] = {}
	by_customer: Dict[str, float] = {}
	by_region_customer: Dict[str, Dict[str, float]] = {}
	by_month: Dict[str, Dict[str, float]] = {}
	premiums: List[float] = []
	for record in records:
		region, status = record['region'], record['policy_status']
		customer = record['customer_id']
		premium_raw = record['premium']
		premium = float(premium_raw) if premium_raw is not None else 0.0
		for bucket, key in ((by_region, region), (by_status, status)):
			entry = bucket.setdefault(key, {'total_premium': 0.0, 'policy_count': 0})
			entry['total_premium'] += premium
			entry['policy_count'] += 1
		by_customer[customer] = by_customer.get(customer, 0.0) + premium
		region_customers = by_region_customer.setdefault(region, {})
		region_customers[customer] = region_customers.get(customer, 0.0) + premium
		effective_date = record.get('effective_date')
		if effective_date:
			month = str(effective_date)[:7]
			month_entry = by_month.setdefault(month, {'total_premium': 0.0, 'policy_count': 0})
			month_entry['total_premium'] += premium
			month_entry['policy_count'] += 1
		if premium_raw is not None:
			premiums.append(premium)
	total_premium = sum(entry['total_premium'] for entry in by_region.values())
	policy_count = sum(entry['policy_count'] for entry in by_region.values())
	high = [p for p in premiums if p >= HIGH_PREMIUM_THRESHOLD]
	return {
		'by_region': by_region,
		'by_status': by_status,
		'by_customer': by_customer,
		'by_region_customer': by_region_customer,
		'by_month': by_month,
		'total': {'total_premium': total_premium, 'policy_count': policy_count},
		'high': {'count': len(high), 'total_premium': sum(high)},
		'premiums_desc': sorted(premiums, reverse=True),
		'between_1000_1300': len([p for p in premiums if 1000 <= p <= 1300]),
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

	def _retrying(self, action: Callable[[], None]) -> None:
		"""Run an assertion block with retries (cushions query-cache lag)."""
		last_error = ''
		for attempt in range(1, RETRIES + 1):
			try:
				action()
				return
			except AssertionError as e:
				last_error = str(e)
				if attempt < RETRIES:
					time.sleep(RETRY_INTERVAL_SECONDS)
		raise AssertionError(last_error)

	# ------------------------------------------------------------------- steps

	def check_health(self) -> None:
		result = self.cli(['health'])
		self.report.record(f'{self.prefix}.health', True, truncate(result))

	def check_metrics_listed(self) -> None:
		# strict shape: /metricflow/list_metrics must answer {metrics: [{name, ...}]}
		result = self.cli(['metrics', 'list'])
		payload = result.get('metrics') if isinstance(result, dict) else None
		if not isinstance(payload, list):
			raise AssertionError(f'metrics list shape unexpected: {truncate(result)}')
		names = {item.get('name') for item in payload if isinstance(item, dict)}
		missing = {METRIC_TOTAL, METRIC_RATIO} - names
		if missing:
			raise AssertionError(f'metrics not listed: {sorted(missing)}')
		self.report.record(f'{self.prefix}.metrics_listed', True,
			f'{METRIC_TOTAL}, {METRIC_RATIO} present')

	def check_metric_dimensions(self) -> None:
		result = self.cli(['metrics', 'dimensions', METRIC_TOTAL])
		dimensions = {d.get('name') for d in (result.get('dimensions') or [])}
		missing = {'region', 'policy_status', 'effective_date'} - dimensions
		if missing:
			raise AssertionError(f'dimensions missing for {METRIC_TOTAL}: {sorted(missing)}')
		self.report.record(f'{self.prefix}.metric_dimensions', True, f'{sorted(dimensions)}')

	def check_find_dimensions(self) -> None:
		result = self.cli(['metrics', 'find-dimensions',
			'--metrics', f'{METRIC_TOTAL},{METRIC_RATIO}'])
		dimensions = {d.get('name') for d in (result.get('dimensions') or [])}
		missing = {'region', 'policy_status'} - dimensions
		if missing:
			raise AssertionError(f'shared dimensions missing: {sorted(missing)}')
		self.report.record(f'{self.prefix}.find_dimensions', True, f'{sorted(dimensions)}')

	def check_total_premium_by_region(self) -> None:
		def run() -> None:
			result = self.cli(['metrics', 'value', METRIC_TOTAL, '--group-by', 'region'])
			rows = rows_as_dicts(result)
			self.__assert_group_sum(rows, 'region', self.expected['by_region'], 'total_premium')
			self.report.record(f'{self.prefix}.metric_total_by_region', True, truncate(rows))
		self._retrying(run)

	def check_total_premium_by_status(self) -> None:
		def run() -> None:
			result = self.cli(['metrics', 'value', METRIC_TOTAL, '--group-by', 'policy_status'])
			rows = rows_as_dicts(result)
			self.__assert_group_sum(rows, 'policy_status', self.expected['by_status'], 'total_premium')
			self.report.record(f'{self.prefix}.metric_total_by_status', True, truncate(rows))
		self._retrying(run)

	def check_ratio_metric(self) -> None:
		def run() -> None:
			result = self.cli(['metrics', 'value', METRIC_RATIO])
			rows = rows_as_dicts(result)
			# an un-grouped metric query must return exactly one row
			if len(rows) != 1:
				raise AssertionError(
					f'{METRIC_RATIO} returned {len(rows)} rows, expected exactly 1: {truncate(result)}')
			expected = self.expected['total']['total_premium'] / self.expected['total']['policy_count']
			value = metric_column(rows[0], dimension='__none__')
			if value is None or abs(value - expected) > TOLERANCE:
				raise AssertionError(f'{METRIC_RATIO} expected ~{expected}, got {rows[0]}')
			self.report.record(f'{self.prefix}.metric_ratio', True, f'{value:.2f} ~ {expected:.2f}')
		self._retrying(run)

	def check_time_window(self) -> None:
		"""Time-dimension contract: window filters and month-granularity buckets."""
		expected = self.expected
		months = sorted(expected['by_month'])
		start, end = f'{months[0]}-01T00:00:00', f'{months[-1]}-31T23:59:59'

		def window_sum(start_time: str, end_time: str) -> float:
			result = self.cli(['metrics', 'value', METRIC_TOTAL,
				'--start-time', start_time, '--end-time', end_time])
			rows = rows_as_dicts(result)
			if not rows:
				raise AssertionError(f'time window returned no rows: {truncate(result)}')
			return sum(v for v in (metric_column(row, '__none__') for row in rows) if v is not None)

		def run_full() -> None:
			actual = window_sum(start, end)
			if abs(actual - expected['total']['total_premium']) > TOLERANCE:
				raise AssertionError(
					f'full window expected {expected["total"]["total_premium"]}, got {actual}')
			self.report.record(f'{self.prefix}.metric_time_window_full', True,
				f'{actual} over {months[0]}..{months[-1]}')
		self._retrying(run_full)

		# single-month window must isolate exactly that month's bucket
		import calendar
		target_month = months[0]
		year, month = (int(part) for part in target_month.split('-'))
		last_day = calendar.monthrange(year, month)[1]
		target_sum = expected['by_month'][target_month]['total_premium']

		def run_month() -> None:
			actual = window_sum(
				f'{target_month}-01T00:00:00', f'{target_month}-{last_day:02d}T23:59:59')
			if abs(actual - target_sum) > TOLERANCE:
				raise AssertionError(f'{target_month} window expected {target_sum}, got {actual}')
			self.report.record(f'{self.prefix}.metric_time_window_month', True,
				f'{target_month}: {actual}')
		self._retrying(run_month)

		def run_granularity() -> None:
			result = self.cli(['metrics', 'value', METRIC_TOTAL,
				'--group-by', 'effective_date', '--time-granularity', 'month',
				'--start-time', start, '--end-time', end])
			rows = rows_as_dicts(result)
			buckets: Dict[str, float] = {}
			for row in rows:
				bucket = str(row.get('effective_date') or '')[:7]
				value = metric_column(row, 'effective_date')
				if value is None:
					raise AssertionError(f'granularity row without numeric value: {row}')
				buckets[bucket] = buckets.get(bucket, 0.0) + value
			if set(buckets) != set(expected['by_month']):
				raise AssertionError(
					f'month buckets got {sorted(buckets)}, expected {sorted(expected["by_month"])}')
			for month, entry in expected['by_month'].items():
				if abs(buckets[month] - entry['total_premium']) > TOLERANCE:
					raise AssertionError(
						f'month {month}: got {buckets[month]}, expected {entry["total_premium"]}')
			self.report.record(f'{self.prefix}.metric_time_granularity', True, truncate(buckets))
		self._retrying(run_granularity)

	def check_gold_tables(self) -> None:
		"""DB-plane evidence for the multi-stage / computed / write-factor pipeline."""
		from agent_scenario import db_check
		if not db_check.db_available(self.settings):
			self.report.record(f'{self.prefix}.gold', True, 'skipped: SCN_MYSQL_USER not set')
			return
		settings, report, expected = self.settings, self.report, self.expected
		db_check.check(settings, report, f'{self.prefix}.gold_rows',
			'select count(*) from topic_gold_policy',
			expected['total']['policy_count'])
		db_check.check(settings, report, f'{self.prefix}.gold_sum',
			'select coalesce(sum(premium), 0) from topic_gold_policy',
			expected['total']['total_premium'],
			compare=lambda a, e: abs(float(a) - e) < TOLERANCE)
		db_check.check(settings, report, f'{self.prefix}.gold_year_computed',
			'select count(distinct effective_year) from topic_gold_policy', 1)
		db_check.check(settings, report, f'{self.prefix}.gold_year_value',
			'select min(effective_year) from topic_gold_policy', 2026)
		db_check.check(settings, report, f'{self.prefix}.gold_high_flag',
			"select count(*) from topic_gold_policy where high_premium = 'Y'",
			expected['high']['count'])
		db_check.check(settings, report, f'{self.prefix}.gold_high_sum',
			"select coalesce(sum(premium), 0) from topic_gold_policy where high_premium = 'Y'",
			expected['high']['total_premium'],
			compare=lambda a, e: abs(float(a) - e) < TOLERANCE)

	def _resolve_ontology(self) -> Dict[str, str]:
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
		object_ids: Dict[str, str] = {}
		for virtual_object in detail.get('virtualObjects') or []:
			name = virtual_object.get('name')
			if name in (ONTOLOGY_OBJECT, ONTOLOGY_POLICY_OBJECT):
				object_ids[name] = str(virtual_object.get('id'))
		missing = {ONTOLOGY_OBJECT, ONTOLOGY_POLICY_OBJECT} - set(object_ids)
		if missing:
			raise AssertionError(f'virtual objects {missing} not found: {truncate(detail)}')
		self.report.record(f'{self.prefix}.ontology_discovery', True,
			f'ontologyId {ontology_id}, objects {sorted(object_ids)}')
		object_ids['__ontology__'] = str(ontology_id)
		return object_ids

	def check_ontology(self) -> None:
		ids = self._resolve_ontology()
		ontology_id, object_id = ids['__ontology__'], ids[ONTOLOGY_OBJECT]

		# the platform may require at least one filter per ontology query
		# (ONTOLOGY_QUERY_REQUIRE_FILTERS), so pin region = east everywhere
		region_filter = '{"region": "east"}'
		compiled = self.cli([
			'ontology', 'compile', ontology_id, '--virtual-object', object_id,
			'--filters', region_filter, '--include-derived', DERIVED_ATTRIBUTE])
		sql = str(compiled).lower()
		if 'join' not in sql:
			raise AssertionError(f'compiled SQL has no join: {truncate(compiled)}')
		self.report.record(f'{self.prefix}.ontology_compile', True, 'compiled SQL contains join')

		def run_query() -> None:
			queried = self.cli([
				'ontology', 'query', ontology_id, '--virtual-object', object_id,
				'--filters', region_filter,
				'--fields', 'customer_id', '--include-derived', DERIVED_ATTRIBUTE])
			self.__assert_ontology_rows(queried, self.expected['by_region_customer']['east'])
		self._retrying(run_query)

	def check_ontology_operators(self) -> None:
		"""Policy-object query surface: operators, order-by, limit/offset, group-by."""
		ids = self._resolve_ontology()
		ontology_id, policy_id = ids['__ontology__'], ids[ONTOLOGY_POLICY_OBJECT]
		expected = self.expected

		def policy_rows(filters: str, extra: List[str] = None) -> List[Dict[str, Any]]:
			args = ['ontology', 'query', ontology_id, '--virtual-object', policy_id,
				'--filters', filters, '--fields', 'policy_id,premium', '--limit', '100']
			if extra:
				args += extra
			result = self.cli(args)
			return result.get('rows') or []

		def run() -> None:
			# gte: count must equal the high-premium population (cross-checks the
			# conditional pipeline flag in gold_policy)
			rows = policy_rows('{"premium": {"operator": "gte", "value": 1000}}')
			if len(rows) != expected['high']['count']:
				raise AssertionError(
					f'gte filter got {len(rows)} rows, expected {expected["high"]["count"]}')
			self.report.record(f'{self.prefix}.ontology_op_gte', True,
				f'{len(rows)} rows >= 1000')

			# in operator
			rows = policy_rows('{"policy_status": {"operator": "in", "value": ["active"]}}')
			if len(rows) != expected['by_status']['active']['policy_count']:
				raise AssertionError(
					f'in filter got {len(rows)} rows, '
					f'expected {expected["by_status"]["active"]["policy_count"]}')
			self.report.record(f'{self.prefix}.ontology_op_in', True, f'{len(rows)} active rows')

			# between operator
			rows = policy_rows('{"premium": {"operator": "between", "value": [1000, 1300]}}')
			if len(rows) != expected['between_1000_1300']:
				raise AssertionError(
					f'between filter got {len(rows)} rows, expected {expected["between_1000_1300"]}')
			self.report.record(f'{self.prefix}.ontology_op_between', True, f'{len(rows)} rows')

			# order-by + limit
			rows = policy_rows('{"policy_status": {"operator": "in", "value": ["active", "lapsed"]}}',
				['--order-by', 'premium:desc', '--limit', '3'])
			top = sorted((self._row_premium(row) for row in rows), reverse=True)
			want = expected['premiums_desc'][:3]
			if top != want:
				raise AssertionError(f'order-by top3 got {top}, expected {want}')
			self.report.record(f'{self.prefix}.ontology_order_limit', True, f'top3 {top}')

			# offset pagination
			rows = policy_rows('{"policy_status": {"operator": "in", "value": ["active", "lapsed"]}}',
				['--order-by', 'premium:desc', '--limit', '1', '--offset', '1'])
			if len(rows) != 1 or self._row_premium(rows[0]) != expected['premiums_desc'][1]:
				raise AssertionError(
					f'offset query got {rows}, expected premium {expected["premiums_desc"][1]}')
			self.report.record(f'{self.prefix}.ontology_offset', True,
				f'second highest {expected["premiums_desc"][1]}')

			# group-by region on Policy
			result = self.cli(['ontology', 'query', ontology_id, '--virtual-object', policy_id,
				'--filters', '{"policy_status": {"operator": "in", "value": ["active", "lapsed"]}}',
				'--group-by', 'region', '--limit', '100'])
			regions = {str(row.get('region')) for row in (result.get('rows') or [])}
			if regions != set(expected['by_region']):
				raise AssertionError(
					f'group-by regions got {sorted(regions)}, expected {sorted(expected["by_region"])}')
			self.report.record(f'{self.prefix}.ontology_group_by', True, sorted(regions))
		self._retrying(run)

	@staticmethod
	def _row_premium(row: Dict[str, Any]) -> Optional[float]:
		try:
			return float(row.get('premium'))
		except (TypeError, ValueError):
			return None

	def __assert_ontology_rows(self, queried: Dict[str, Any], expected: Dict[str, float]) -> None:
		rows = queried.get('rows') or []
		if len(rows) != len(expected):
			raise AssertionError(
				f'ontology query returned {len(rows)} rows, expected {len(expected)}: {truncate(queried)}')
		for row in rows:
			self.__check_derived_value(row, expected)
		self.report.record(f'{self.prefix}.ontology_query', True,
			f'{len(rows)} customers, all derived {DERIVED_ATTRIBUTE} values verified')

	def __check_derived_value(self, row: Dict[str, Any], expected: Dict[str, float]) -> None:
		"""Strict per-row verification: every row must resolve and match."""
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
			raise AssertionError(f'row carries no numeric derived value: {row}')
		customer = str(row.get('customer_id') or '').strip()
		if not customer:
			raise AssertionError(f'row carries no customer_id: {row}')
		matches = [key for key in expected
			if key == customer or key.startswith(customer) or customer.startswith(key)]
		if len(matches) != 1:
			raise AssertionError(
				f'customer [{customer}] does not resolve to exactly one mock customer: {row}')
		value = expected[matches[0]]
		if abs(derived - value) > TOLERANCE:
			raise AssertionError(
				f'customer {customer} derived {DERIVED_ATTRIBUTE}={derived}, expected {value}')

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
		self.check_metric_dimensions()
		self.check_find_dimensions()
		self.check_total_premium_by_region()
		self.check_total_premium_by_status()
		self.check_ratio_metric()
		self.check_time_window()
		self.check_ontology()
		self.check_ontology_operators()
		self.check_gold_tables()
