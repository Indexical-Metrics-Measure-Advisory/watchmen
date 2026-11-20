from datetime import date
from typing import List, Optional

from watchmen_meta.common import TupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityRow, EntityShaper, EntitySortColumn, EntitySortMethod
from watchmen_utilities import is_not_blank

from ..model.run import RunDependencyState, TaskRun, TaskRunDependency, TaskRunDependencyId, TaskRunId, TaskRunStatus, \
	TriggerType
from ..model.task import TaskDefinitionId, TaskType
from .common import TaskHubTupleService, tenant_criteria, value_of


class TaskRunShaper(EntityShaper):
	def serialize(self, run: TaskRun) -> EntityRow:
		return TupleShaper.serialize_tenant_based(run, {
			'run_id': run.runId, 'task_id': run.taskId, 'task_type': value_of(run.taskType),
			'instance_key': run.instanceKey, 'attempt': run.attempt, 'retry_of_run_id': run.retryOfRunId,
			'process_date': run.processDate, 'window_start': run.windowStart, 'window_end': run.windowEnd,
			'status': value_of(run.status), 'trigger_type': value_of(run.triggerType),
			'bypass_dependencies': run.bypassDependencies, 'idempotency_key': run.idempotencyKey,
			'request_hash': run.requestHash, 'engine_run_key': run.engineRunKey,
			'execution_target': run.executionTarget, 'callback_token_hash': run.callbackTokenHash,
			'started_at': run.startedAt, 'finished_at': run.finishedAt, 'duration_ms': run.durationMs,
			'row_count': run.rowCount, 'error_code': run.errorCode, 'error_message': run.errorMessage,
			'result_refs': run.resultRefs or {}, 'triggered_by': run.triggeredBy
		})

	def deserialize(self, row: EntityRow) -> TaskRun:
		run = TaskRun(
			runId=row.get('run_id'), taskId=row.get('task_id'), taskType=row.get('task_type'),
			instanceKey=row.get('instance_key'), attempt=row.get('attempt') or 0,
			retryOfRunId=row.get('retry_of_run_id'), processDate=row.get('process_date'),
			windowStart=row.get('window_start'), windowEnd=row.get('window_end'), status=row.get('status'),
			triggerType=row.get('trigger_type'), bypassDependencies=row.get('bypass_dependencies', False),
			idempotencyKey=row.get('idempotency_key'), requestHash=row.get('request_hash'),
			engineRunKey=row.get('engine_run_key'), executionTarget=row.get('execution_target'),
			callbackTokenHash=row.get('callback_token_hash'), startedAt=row.get('started_at'),
			finishedAt=row.get('finished_at'), durationMs=row.get('duration_ms'), rowCount=row.get('row_count'),
			errorCode=row.get('error_code'), errorMessage=row.get('error_message'),
			resultRefs=row.get('result_refs') or {}, triggeredBy=row.get('triggered_by'))
		return TupleShaper.deserialize_tenant_based(row, run)


TASK_RUN_ENTITY_NAME = 'task_runs'
TASK_RUN_ENTITY_SHAPER = TaskRunShaper()
RUN_CREATED_AT_DESC_SORT = [EntitySortColumn(name='created_at', method=EntitySortMethod.DESC)]


class TaskRunService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_RUN_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_RUN_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'run_id'

	def get_storable_id(self, storable: TaskRun) -> TaskRunId:
		return storable.runId

	def set_storable_id(self, storable: TaskRun, storable_id: TaskRunId) -> TaskRun:
		storable.runId = storable_id
		return storable

	def find_by_run_id(self, run_id: TaskRunId, tenant_id: TenantId) -> Optional[TaskRun]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='run_id'), right=run_id),
			*tenant_criteria(tenant_id)]))

	def find_by_idempotency_key(
			self, task_id: TaskDefinitionId, key: str, tenant_id: TenantId) -> Optional[TaskRun]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='idempotency_key'), right=key),
			*tenant_criteria(tenant_id)]))

	def find_by_engine_run_key(
			self, task_id: TaskDefinitionId, engine_run_key: str, tenant_id: TenantId) -> Optional[TaskRun]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='engine_run_key'), right=engine_run_key),
			*tenant_criteria(tenant_id)]))

	def find_latest_attempt(
			self, task_id: TaskDefinitionId, instance_key: str, tenant_id: TenantId) -> Optional[TaskRun]:
		page = self.storage.page(self.get_entity_pager(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='instance_key'), right=instance_key),
			*tenant_criteria(tenant_id)], pageable=Pageable(pageNumber=1, pageSize=1),
			sort=[EntitySortColumn(name='attempt', method=EntitySortMethod.DESC)]))
		return page.data[0] if page.data else None

	def find_by_process_date(
			self, task_id: TaskDefinitionId, process_date: date, tenant_id: TenantId) -> List[TaskRun]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='process_date'), right=process_date),
			*tenant_criteria(tenant_id)], sort=RUN_CREATED_AT_DESC_SORT))

	def find_waiting(self, tenant_id: Optional[TenantId] = None) -> List[TaskRun]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=TaskRunStatus.WAITING.value),
			*tenant_criteria(tenant_id)]))

	def find_page(
			self, task_id: Optional[TaskDefinitionId], task_type: Optional[TaskType], status: Optional[TaskRunStatus],
			process_date: Optional[date], instance_key: Optional[str], tenant_id: TenantId, pageable: Pageable
	) -> DataPage:
		criteria = tenant_criteria(tenant_id)
		for column, value in (
				('task_id', task_id), ('task_type', value_of(task_type)), ('status', value_of(status)),
				('process_date', process_date), ('instance_key', instance_key)):
			if value is not None and (not isinstance(value, str) or is_not_blank(value)):
				criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName=column), right=value))
		return self.storage.page(self.get_entity_pager(
			criteria=criteria, pageable=pageable, sort=RUN_CREATED_AT_DESC_SORT))


class TaskRunDependencyShaper(EntityShaper):
	def serialize(self, dependency: TaskRunDependency) -> EntityRow:
		return TupleShaper.serialize_tenant_based(dependency, {
			'run_dependency_id': dependency.runDependencyId, 'run_id': dependency.runId,
			'dependency_id': dependency.dependencyId, 'upstream_run_id': dependency.upstreamRunId,
			'state': value_of(dependency.state), 'reason': dependency.reason, 'evaluated_at': dependency.evaluatedAt
		})

	def deserialize(self, row: EntityRow) -> TaskRunDependency:
		dependency = TaskRunDependency(
			runDependencyId=row.get('run_dependency_id'), runId=row.get('run_id'),
			dependencyId=row.get('dependency_id'), upstreamRunId=row.get('upstream_run_id'),
			state=row.get('state'), reason=row.get('reason'), evaluatedAt=row.get('evaluated_at'))
		return TupleShaper.deserialize_tenant_based(row, dependency)


TASK_RUN_DEPENDENCY_ENTITY_NAME = 'task_run_dependencies'
TASK_RUN_DEPENDENCY_ENTITY_SHAPER = TaskRunDependencyShaper()


class TaskRunDependencyService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_RUN_DEPENDENCY_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_RUN_DEPENDENCY_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'run_dependency_id'

	def get_storable_id(self, storable: TaskRunDependency) -> TaskRunDependencyId:
		return storable.runDependencyId

	def set_storable_id(self, storable: TaskRunDependency, storable_id: TaskRunDependencyId) -> TaskRunDependency:
		storable.runDependencyId = storable_id
		return storable

	def find_by_run_id(self, run_id: TaskRunId, tenant_id: TenantId) -> List[TaskRunDependency]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='run_id'), right=run_id),
			*tenant_criteria(tenant_id)]))

	def find_by_upstream_run_id(self, run_id: TaskRunId, tenant_id: TenantId) -> List[TaskRunDependency]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='upstream_run_id'), right=run_id),
			*tenant_criteria(tenant_id)]))
