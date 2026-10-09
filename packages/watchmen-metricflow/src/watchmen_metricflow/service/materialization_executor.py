from dataclasses import dataclass
from datetime import date, datetime, time as dt_time, timedelta
from logging import getLogger
from typing import Any, List, Optional, Tuple

from starlette.concurrency import run_in_threadpool

from watchmen_auth import PrincipalService
from watchmen_metricflow.meta.metric_access_service import check_metric_names_allowed
from watchmen_metricflow.metricflow.main_api import query as dbt_query
from watchmen_metricflow.model.materialization import Materialization, MaterializationEngine, TimeGrain
from watchmen_metricflow.model.metric_request import MetricQueryRequest
from watchmen_metricflow.model.semantic import TimeGranularity
from watchmen_metricflow.router.metric_router import build_metric_config, ensure_dbt_path
from watchmen_metricflow.service.direct_metric_query_service import try_direct_metric_query
from watchmen_metricflow.service.meta_service import get_metric_service
from watchmen_metricflow.settings import ask_materialization_engine
from watchmen_utilities import is_blank
from .materialization_error import MaterializationError
from .materialization_factor_mapping import TIME_SOURCE_PREFIX, find_missing_dimensions
from .materialization_spark import is_spark_configured, offload_to_spark_submit

logger = getLogger(__name__)


@dataclass
class QueryOutcome:
	column_names: List[str]
	rows: List[Tuple]
	engine: MaterializationEngine
	sql_preview: str


def compute_window(time_grain: Any, now: Optional[datetime] = None) -> Tuple[date, date]:
	"""
	Window refreshed by one run: yesterday, plus the whole current period of the
	granularity so a weekly/monthly materialization always rewrites its latest
	(partial) bucket. Idempotent under MERGE thanks to the business key.
	"""
	moment = now if now is not None else datetime.now()
	end = moment.date() - timedelta(days=1)
	grain = TimeGrain(time_grain) if not isinstance(time_grain, TimeGrain) else time_grain
	if grain == TimeGrain.WEEK:
		start = end - timedelta(days=end.weekday())
	elif grain == TimeGrain.MONTH:
		start = end.replace(day=1)
	elif grain == TimeGrain.QUARTER:
		month = end.month - ((end.month - 1) % 3)
		start = end.replace(month=month, day=1)
	elif grain == TimeGrain.YEAR:
		start = end.replace(month=1, day=1)
	else:
		start = end
	return start, end


def build_request(
		materialization: Materialization, window_start: date, window_end: date
) -> MetricQueryRequest:
	group_by = [dimension for dimension in (materialization.groupBy or []) if not is_blank(dimension)]
	time_dimension = f'{TIME_SOURCE_PREFIX}__{TimeGrain(materialization.timeGrain).value}'
	if time_dimension not in group_by:
		group_by.append(time_dimension)
	return MetricQueryRequest(
		metric=materialization.metricName,
		group_by=group_by,
		time_granularity=TimeGranularity(str(materialization.timeGrain)),
		start_time=datetime.combine(window_start, dt_time.min),
		end_time=datetime.combine(window_end, dt_time(23, 59, 59))
	)


def build_sql_preview(
		materialization: Materialization, window_start: date, window_end: date,
		engine: MaterializationEngine
) -> str:
	group_by = ', '.join(materialization.groupBy or []) or '(none)'
	return (
		f'-- materialization query (textual preview, executed by the metric engine)\n'
		f'SELECT {TIME_SOURCE_PREFIX}__{materialization.timeGrain}, {group_by}, '
		f'{materialization.metricName}\n'
		f'FROM metric:{materialization.metricName}\n'
		f'WHERE {TIME_SOURCE_PREFIX} >= \'{window_start}\' AND {TIME_SOURCE_PREFIX} '
		f'<= \'{window_end}\'\n'
		f'-- engine: {engine.value}'
	)


def _resolve_requested_engine(materialization: Materialization) -> MaterializationEngine:
	requested = str(materialization.engine or 'AUTO').strip().upper()
	try:
		engine = MaterializationEngine(requested)
	except ValueError:
		raise MaterializationError(f'Materialization engine [{requested}] is not supported.')
	if engine == MaterializationEngine.AUTO:
		default = ask_materialization_engine()
		try:
			engine = MaterializationEngine(default)
		except ValueError:
			engine = MaterializationEngine.AUTO
	return engine


async def execute_metric_query(
		materialization: Materialization, principal_service: PrincipalService
) -> QueryOutcome:
	"""Run the metric query, storage engine (direct bypass first, dbt fallback) or spark."""
	if is_blank(materialization.metricName):
		raise MaterializationError('Metric name is required.')

	await run_in_threadpool(
		check_metric_names_allowed, get_metric_service(principal_service), principal_service,
		[materialization.metricName])

	window_start, window_end = compute_window(materialization.timeGrain)
	request = build_request(materialization, window_start, window_end)
	requested = _resolve_requested_engine(materialization)

	if requested == MaterializationEngine.SPARK:
		if not is_spark_configured():
			logger.warning(
				f'Materialization [{materialization.materializationId}] requests spark, '
				f'falling back to the storage engine.')
		else:
			await run_in_threadpool(
				offload_to_spark_submit, materialization, window_start, window_end, request.group_by)

	decline_reasons: List[str] = []
	direct_result = None
	try:
		direct_result = await try_direct_metric_query(request, principal_service, decline_reasons)
	except Exception as e:
		logger.warning(f'Materialization [{materialization.materializationId}] direct query failed: {e}')

	if direct_result is not None:
		outcome = QueryOutcome(
			column_names=list(direct_result.column_names),
			rows=[tuple(row) for row in direct_result.data],
			engine=MaterializationEngine.STORAGE,
			sql_preview=build_sql_preview(materialization, window_start, window_end,
			                              MaterializationEngine.STORAGE)
		)
	else:
		logger.info(
			f'Materialization [{materialization.materializationId}] falls back to the dbt path, '
			f'declined because: {decline_reasons}')
		config = await build_metric_config(principal_service)
		ensure_dbt_path(config, [materialization.metricName], decline_reasons)
		query_result = await run_in_threadpool(
			dbt_query,
			cfg=config,
			metrics=[materialization.metricName],
			group_by=request.group_by,
			start_time=request.start_time,
			end_time=request.end_time
		)
		outcome = QueryOutcome(
			column_names=list(query_result.result_df.column_names),
			rows=[tuple(row) for row in query_result.result_df.rows],
			engine=MaterializationEngine.STORAGE,
			sql_preview=build_sql_preview(materialization, window_start, window_end,
			                              MaterializationEngine.STORAGE)
		)

	missing = find_missing_dimensions(outcome.column_names, materialization.groupBy)
	if missing:
		raise MaterializationError(
			f'Dimensions [{", ".join(missing)}] are missing from the metric query result, '
			f'the metric definition may have changed.')
	return outcome


def preview_window(materialization: Materialization, now: Optional[datetime] = None) -> Tuple[date, date]:
	return compute_window(materialization.timeGrain, now)
