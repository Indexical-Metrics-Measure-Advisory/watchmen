from datetime import date, datetime
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import StorageService, TupleService, TupleShaper, \
	UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator, EntityFinder, EntityHelper, EntityIdHelper, \
	EntityRow, EntityShaper, EntitySortColumn, EntitySortMethod, SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import get_current_time_in_seconds, is_not_blank

from ..model.materialization import Materialization, MaterializationFlow, MaterializationJobLock, \
	MaterializationJobLockId, MaterializationRun, MaterializationRunFilter, MaterializationSchedule, RunStatus


class MaterializationShaper(UserBasedTupleShaper):
	@staticmethod
	def serialize_schedule(schedule: MaterializationSchedule, row: EntityRow) -> EntityRow:
		row['frequency'] = schedule.frequency
		row['time'] = schedule.time
		row['date'] = schedule.date
		row['weekday'] = schedule.weekday
		row['day_of_month'] = schedule.dayOfMonth
		row['schedule_enabled'] = schedule.enabled
		return row

	@staticmethod
	def deserialize_schedule(row: EntityRow) -> MaterializationSchedule:
		return MaterializationSchedule(
			enabled=row.get('schedule_enabled', False),
			frequency=row.get('frequency') or 'day',
			time=row.get('time'),
			date=row.get('date'),
			weekday=row.get('weekday'),
			dayOfMonth=row.get('day_of_month')
		)

	@staticmethod
	def serialize_factor_mapping(materialization: Materialization) -> Optional[list]:
		if materialization.factorMapping is None:
			return None
		return [
			column if isinstance(column, dict) else column.model_dump()
			for column in materialization.factorMapping
		]

	def serialize(self, materialization: Materialization) -> EntityRow:
		row = {
			'id': materialization.materializationId,
			'name': materialization.name,
			'metric_id': materialization.metricId,
			'metric_name': materialization.metricName,
			'metric_label': materialization.metricLabel,
			'target_topic_id': materialization.targetTopicId,
			'target_topic_name': materialization.targetTopicName,
			'auto_create_topic': materialization.autoCreateTopic,
			'time_grain': materialization.timeGrain,
			'group_by': materialization.groupBy,
			'write_mode': materialization.writeMode,
			'engine': materialization.engine,
			'enabled': materialization.enabled,
			'factor_mapping': self.serialize_factor_mapping(materialization),
			'description': materialization.description,
			'rebuild_pending': materialization.rebuildPending
		}
		row = self.serialize_schedule(materialization.schedule, row)
		return UserBasedTupleShaper.serialize(materialization, row)

	def deserialize(self, row: EntityRow) -> Materialization:
		materialization = Materialization(
			materializationId=row.get('id'),
			name=row.get('name'),
			metricId=row.get('metric_id'),
			metricName=row.get('metric_name'),
			metricLabel=row.get('metric_label'),
			targetTopicId=row.get('target_topic_id'),
			targetTopicName=row.get('target_topic_name'),
			autoCreateTopic=row.get('auto_create_topic', True),
			timeGrain=row.get('time_grain'),
			groupBy=row.get('group_by') or [],
			writeMode=row.get('write_mode'),
			engine=row.get('engine'),
			schedule=self.deserialize_schedule(row),
			factorMapping=row.get('factor_mapping'),
			enabled=row.get('enabled', True),
			description=row.get('description'),
			rebuildPending=bool(row.get('rebuild_pending')),
			updatedAt=row.get('last_modified_at')
		)
		# noinspection PyTypeChecker
		materialization: Materialization = UserBasedTupleShaper.deserialize(row, materialization)
		return materialization


MATERIALIZATION_ENTITY_NAME = 'metric_materializations'
MATERIALIZATION_ENTITY_SHAPER = MaterializationShaper()

RUN_STARTED_AT_DESC_SORT = [EntitySortColumn(name='started_at', method=EntitySortMethod.DESC)]


class MaterializationService(UserBasedTupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return MATERIALIZATION_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return MATERIALIZATION_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'id'

	def get_storable_id(self, storable: Materialization) -> str:
		return storable.materializationId

	def set_storable_id(self, storable: Materialization, storable_id: str) -> Materialization:
		storable.materializationId = storable_id
		return storable

	def find_all_by_tenant_id(self, tenant_id: Optional[TenantId]) -> List[Materialization]:
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	# noinspection PyTypeChecker
	def find_all_enabled_with_schedule(self) -> List[Materialization]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='enabled'), right=True),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='schedule_enabled'), right=True)
		]))

	def find_page(self, keyword: Optional[str], pageable: Pageable) -> DataPage:
		tenant_id = self.principalService.get_tenant_id()
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		if is_not_blank(keyword):
			like = f'%{keyword.strip()}%'
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='name'),
						operator=EntityCriteriaOperator.LIKE, right=like),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='metric_name'),
						operator=EntityCriteriaOperator.LIKE, right=like)
				]
			))
		# noinspection PyTypeChecker
		return self.storage.page(self.get_entity_pager(
			criteria=criteria, pageable=pageable,
			sort=[EntitySortColumn(name='id', method=EntitySortMethod.DESC)]))


class MaterializationFlowShaper(UserBasedTupleShaper):
	def serialize(self, flow: MaterializationFlow) -> EntityRow:
		row = {
			'id': flow.flowId,
			'name': flow.name,
			'materialization_ids': flow.materializationIds,
			'enabled': flow.enabled,
			'description': flow.description
		}
		row = MaterializationShaper.serialize_schedule(flow.schedule, row)
		return UserBasedTupleShaper.serialize(flow, row)

	def deserialize(self, row: EntityRow) -> MaterializationFlow:
		flow = MaterializationFlow(
			flowId=row.get('id'),
			name=row.get('name'),
			materializationIds=row.get('materialization_ids') or [],
			schedule=MaterializationShaper.deserialize_schedule(row),
			enabled=row.get('enabled', True),
			description=row.get('description'),
			updatedAt=row.get('last_modified_at')
		)
		# noinspection PyTypeChecker
		flow: MaterializationFlow = UserBasedTupleShaper.deserialize(row, flow)
		return flow


MATERIALIZATION_FLOW_ENTITY_NAME = 'materialization_flows'
MATERIALIZATION_FLOW_ENTITY_SHAPER = MaterializationFlowShaper()


class MaterializationFlowService(UserBasedTupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return MATERIALIZATION_FLOW_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return MATERIALIZATION_FLOW_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'id'

	def get_storable_id(self, storable: MaterializationFlow) -> str:
		return storable.flowId

	def set_storable_id(self, storable: MaterializationFlow, storable_id: str) -> MaterializationFlow:
		storable.flowId = storable_id
		return storable

	def find_all_by_tenant_id(self, tenant_id: Optional[TenantId]) -> List[MaterializationFlow]:
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	# noinspection PyTypeChecker
	def find_all_enabled_with_schedule(self) -> List[MaterializationFlow]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='enabled'), right=True),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='schedule_enabled'), right=True)
		]))


class MaterializationRunShaper(TupleShaper):
	def serialize(self, run: MaterializationRun) -> EntityRow:
		row = {
			'run_id': run.runId,
			'materialization_id': run.materializationId,
			'materialization_name': run.materializationName,
			'metric_name': run.metricName,
			'flow_id': run.flowId,
			'flow_name': run.flowName,
			'status': run.status,
			'trigger_type': run.triggerType,
			'engine': run.engine,
			'window_start': run.windowStart,
			'window_end': run.windowEnd,
			'row_count': run.rowCount,
			'duration_ms': run.durationMs,
			'error_message': run.errorMessage,
			'sql_preview': run.sqlPreview,
			'started_at': run.startedAt,
			'finished_at': run.finishedAt
		}
		return TupleShaper.serialize_tenant_based(run, row)

	def deserialize(self, row: EntityRow) -> MaterializationRun:
		run = MaterializationRun(
			runId=row.get('run_id'),
			materializationId=row.get('materialization_id'),
			materializationName=row.get('materialization_name'),
			metricName=row.get('metric_name'),
			flowId=row.get('flow_id'),
			flowName=row.get('flow_name'),
			status=row.get('status'),
			triggerType=row.get('trigger_type'),
			engine=row.get('engine'),
			windowStart=row.get('window_start'),
			windowEnd=row.get('window_end'),
			rowCount=row.get('row_count'),
			durationMs=row.get('duration_ms'),
			errorMessage=row.get('error_message'),
			sqlPreview=row.get('sql_preview'),
			startedAt=row.get('started_at'),
			finishedAt=row.get('finished_at')
		)
		# noinspection PyTypeChecker
		run: MaterializationRun = TupleShaper.deserialize_tenant_based(row, run)
		return run


MATERIALIZATION_RUN_ENTITY_NAME = 'materialization_runs'
MATERIALIZATION_RUN_ENTITY_SHAPER = MaterializationRunShaper()


class MaterializationRunService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return MATERIALIZATION_RUN_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return MATERIALIZATION_RUN_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'run_id'

	def get_storable_id(self, storable: MaterializationRun) -> str:
		return storable.runId

	def set_storable_id(self, storable: MaterializationRun, storable_id: str) -> MaterializationRun:
		storable.runId = storable_id
		return storable

	def find_page(
			self, run_filter: MaterializationRunFilter, pageable: Pageable
	) -> DataPage:
		criteria = []
		if is_not_blank(run_filter.keyword):
			keyword = f'%{run_filter.keyword.strip()}%'
			criteria.append(EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='materialization_name'),
						operator=EntityCriteriaOperator.LIKE, right=keyword),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='metric_name'),
						operator=EntityCriteriaOperator.LIKE, right=keyword),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='run_id'),
						operator=EntityCriteriaOperator.LIKE, right=keyword)
				]
			))
		if is_not_blank(run_filter.status) and str(run_filter.status).upper() != 'ALL':
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='status'), right=run_filter.status))
		if is_not_blank(run_filter.materializationId):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='materialization_id'), right=run_filter.materializationId))
		tenant_id = self.principalService.get_tenant_id()
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(
			criteria=criteria, pageable=pageable, sort=RUN_STARTED_AT_DESC_SORT))

	def find_latest_by_materialization_id(self, materialization_id: str) -> Optional[MaterializationRun]:
		"""Newest run of one materialization, reads a single row instead of the full history."""
		# noinspection PyTypeChecker
		page: DataPage = self.storage.page(self.get_entity_pager(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='materialization_id'), right=materialization_id)
			],
			pageable=Pageable(pageNumber=1, pageSize=1),
			sort=RUN_STARTED_AT_DESC_SORT
		))
		data = page.data or []
		return data[0] if data else None

	# noinspection PyTypeChecker
	def find_latest_status_by_materialization_ids(self, materialization_ids: List[str]) -> dict:
		"""materialization id -> latest run status, used by flow graph nodes."""
		latest = {}
		for materialization_id in materialization_ids:
			run = self.find_latest_by_materialization_id(materialization_id)
			if run is not None:
				latest[materialization_id] = run.status
		return latest

	def find_active_runs_started_before(self, cutoff: datetime) -> List[MaterializationRun]:
		"""PENDING/RUNNING runs older than the cutoff, left behind by a restart."""
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='status'), right=RunStatus.PENDING.value),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='status'), right=RunStatus.RUNNING.value)
				]
			),
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='started_at'),
				operator=EntityCriteriaOperator.LESS_THAN, right=cutoff)
		]))


MATERIALIZATION_JOB_LOCK_ENTITY_NAME = 'materialization_job_locks'
MATERIALIZATION_JOB_LOCK_ID_COLUMN_NAME = 'lock_id'


class MaterializationJobLockShaper(EntityShaper):
	def serialize(self, lock: MaterializationJobLock) -> EntityRow:
		return {
			'lock_id': lock.lockId,
			'tenant_id': lock.tenantId,
			'materialization_id': lock.materializationId,
			'frequency': lock.frequency,
			'process_date': lock.processDate,
			'status': lock.status,
			'user_id': lock.userId,
			'created_at': lock.createdAt
		}

	def deserialize(self, row: EntityRow) -> MaterializationJobLock:
		return MaterializationJobLock(
			lockId=row.get('lock_id'),
			tenantId=row.get('tenant_id'),
			materializationId=row.get('materialization_id'),
			frequency=row.get('frequency'),
			processDate=row.get('process_date'),
			status=row.get('status'),
			userId=row.get('user_id'),
			createdAt=row.get('created_at')
		)


MATERIALIZATION_JOB_LOCK_ENTITY_SHAPER = MaterializationJobLockShaper()


# noinspection DuplicatedCode
class MaterializationJobLockService(StorageService):
	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)
		self.with_principal_service(principal_service)

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return MATERIALIZATION_JOB_LOCK_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return MATERIALIZATION_JOB_LOCK_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(), shaper=self.get_entity_shaper(),
			idColumnName=MATERIALIZATION_JOB_LOCK_ID_COLUMN_NAME)

	def generate_lock_id(self) -> MaterializationJobLockId:
		return str(self.snowflakeGenerator.next_id())

	def create(self, lock: MaterializationJobLock) -> MaterializationJobLock:
		lock.lockId = self.generate_lock_id()
		lock.createdAt = get_current_time_in_seconds()
		self.storage.insert_one(lock, self.get_entity_helper())
		return lock

	def update(self, lock: MaterializationJobLock) -> MaterializationJobLock:
		self.storage.update_one(lock, self.get_entity_id_helper())
		return lock

	def find_by_scope(
			self, tenant_id: str, materialization_id: str, frequency: str, process_date: date
	) -> Optional[MaterializationJobLock]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='materialization_id'), right=materialization_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='frequency'), right=frequency),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='process_date'), right=process_date)
			]
		))
