from typing import List, Optional

from watchmen_meta.common import TupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper, EntitySortColumn, EntitySortMethod
from watchmen_utilities import is_not_blank

from ..model.task import DependencyAdoptionStatus, DependencyCondition, DependencyKind, ExecutionMode, RefRole, RefType, \
	TaskCallbackConfig, TaskDefinition, TaskDefinitionId, TaskDependency, TaskDependencyId, TaskResourceRef, \
	TaskResourceRefId, TaskSchedule, TaskType, UpstreamInstancePolicy
from .common import TaskHubTupleService, tenant_criteria, value_of


class TaskDefinitionShaper(EntityShaper):
	def serialize(self, task: TaskDefinition) -> EntityRow:
		schedule = task.schedule.model_dump(mode='json') if isinstance(task.schedule, TaskSchedule) else task.schedule
		engine_ref = task.engineRef.model_dump(mode='json') if hasattr(task.engineRef, 'model_dump') else task.engineRef
		external_trigger = task.externalTrigger.model_dump(mode='json')
		callback = task.callback.model_dump(mode='json') if isinstance(task.callback, TaskCallbackConfig) else task.callback
		return TupleShaper.serialize_tenant_based(task, {
			'task_id': task.taskId,
			'name': task.name,
			'description': task.description,
			'task_type': value_of(task.taskType),
			'execution_mode': value_of(task.executionMode),
			'engine_kind': task.engineRef.kind,
			'engine_id': task.engineRef.id,
			'engine_ref': engine_ref,
			'schedule': schedule,
			'enabled': task.enabled,
			'owner_id': task.ownerId,
			'tags': task.tags or [],
			'params': task.params or {},
			'external_trigger': external_trigger, 'callback': callback,
			'dependency_wait_timeout_minutes': task.dependencyWaitTimeoutMinutes,
			'freshness_sla_minutes': task.freshnessSlaMinutes,
			'synced_at': task.syncedAt,
			'last_run_summary': task.lastRunSummary
		})

	def deserialize(self, row: EntityRow) -> TaskDefinition:
		task = TaskDefinition(
			taskId=row.get('task_id'), name=row.get('name'), description=row.get('description'),
			taskType=row.get('task_type'), executionMode=row.get('execution_mode'),
			engineRef=row.get('engine_ref') or {'kind': row.get('engine_kind'), 'id': row.get('engine_id')},
			schedule=row.get('schedule'), enabled=row.get('enabled', True), ownerId=row.get('owner_id'),
			tags=row.get('tags') or [], params=row.get('params') or {},
			externalTrigger=row.get('external_trigger') or {'enabled': True},
			callback=row.get('callback') or {},
			dependencyWaitTimeoutMinutes=row.get('dependency_wait_timeout_minutes') or 60,
			freshnessSlaMinutes=row.get('freshness_sla_minutes'), syncedAt=row.get('synced_at'),
			lastRunSummary=row.get('last_run_summary'))
		return TupleShaper.deserialize_tenant_based(row, task)


TASK_DEFINITION_ENTITY_NAME = 'task_definitions'
TASK_DEFINITION_ENTITY_SHAPER = TaskDefinitionShaper()


class TaskDefinitionService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_DEFINITION_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_DEFINITION_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'task_id'

	def get_storable_id(self, storable: TaskDefinition) -> TaskDefinitionId:
		return storable.taskId

	def set_storable_id(self, storable: TaskDefinition, storable_id: TaskDefinitionId) -> TaskDefinition:
		storable.taskId = storable_id
		return storable

	def find_by_task_id(self, task_id: TaskDefinitionId, tenant_id: TenantId) -> Optional[TaskDefinition]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id),
			*tenant_criteria(tenant_id)]))

	def find_by_engine(self, kind: str, engine_id: str, tenant_id: TenantId) -> Optional[TaskDefinition]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='engine_kind'), right=kind),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='engine_id'), right=engine_id),
			*tenant_criteria(tenant_id)]))

	def find_all(self, tenant_id: Optional[TenantId] = None) -> List[TaskDefinition]:
		return self.storage.find(self.get_entity_finder(criteria=tenant_criteria(tenant_id)))

	def find_page(
			self, keyword: Optional[str], task_type: Optional[TaskType], tenant_id: TenantId, pageable: Pageable
	) -> DataPage:
		criteria = tenant_criteria(tenant_id)
		if is_not_blank(keyword):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE,
				right=f'%{keyword.strip()}%'))
		if task_type is not None:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='task_type'), right=value_of(task_type)))
		return self.storage.page(self.get_entity_pager(
			criteria=criteria, pageable=pageable,
			sort=[EntitySortColumn(name='task_id', method=EntitySortMethod.DESC)]))


class TaskResourceRefShaper(EntityShaper):
	def serialize(self, ref: TaskResourceRef) -> EntityRow:
		return TupleShaper.serialize_tenant_based(ref, {
			'ref_id': ref.refId, 'task_id': ref.taskId, 'ref_type': value_of(ref.refType),
			'target_id': ref.targetId, 'target_name': ref.targetName, 'ref_role': value_of(ref.role),
			'inferred': ref.inferred, 'unresolved': ref.unresolved
		})

	def deserialize(self, row: EntityRow) -> TaskResourceRef:
		ref = TaskResourceRef(
			refId=row.get('ref_id'), taskId=row.get('task_id'), refType=row.get('ref_type'),
			targetId=row.get('target_id'), targetName=row.get('target_name'), role=row.get('ref_role'),
			inferred=row.get('inferred', False), unresolved=row.get('unresolved', False))
		return TupleShaper.deserialize_tenant_based(row, ref)


TASK_RESOURCE_REF_ENTITY_NAME = 'task_refs'
TASK_RESOURCE_REF_ENTITY_SHAPER = TaskResourceRefShaper()


class TaskResourceRefService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_RESOURCE_REF_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_RESOURCE_REF_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'ref_id'

	def get_storable_id(self, storable: TaskResourceRef) -> TaskResourceRefId:
		return storable.refId

	def set_storable_id(self, storable: TaskResourceRef, storable_id: TaskResourceRefId) -> TaskResourceRef:
		storable.refId = storable_id
		return storable

	def find_by_task_id(self, task_id: TaskDefinitionId, tenant_id: TenantId) -> List[TaskResourceRef]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id),
			*tenant_criteria(tenant_id)]))

	def find_by_asset(self, ref_type: RefType, target_id: str, tenant_id: TenantId) -> List[TaskResourceRef]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='ref_type'), right=value_of(ref_type)),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='target_id'), right=target_id),
			*tenant_criteria(tenant_id)]))

	def find_all(self, tenant_id: TenantId) -> List[TaskResourceRef]:
		return self.storage.find(self.get_entity_finder(criteria=tenant_criteria(tenant_id)))


class TaskDependencyShaper(EntityShaper):
	def serialize(self, dependency: TaskDependency) -> EntityRow:
		return TupleShaper.serialize_tenant_based(dependency, {
			'dependency_id': dependency.dependencyId, 'upstream_task_id': dependency.upstreamTaskId,
			'downstream_task_id': dependency.downstreamTaskId, 'kind': value_of(dependency.kind),
			'adoption_status': value_of(dependency.adoptionStatus), 'condition_type': value_of(dependency.condition),
			'instance_policy': value_of(dependency.instancePolicy), 'enabled': dependency.enabled,
			'offset_days': dependency.offsetDays, 'declared_by': dependency.declaredBy
		})

	def deserialize(self, row: EntityRow) -> TaskDependency:
		dependency = TaskDependency(
			dependencyId=row.get('dependency_id'), upstreamTaskId=row.get('upstream_task_id'),
			downstreamTaskId=row.get('downstream_task_id'), kind=row.get('kind'),
			adoptionStatus=row.get('adoption_status'), condition=row.get('condition_type'),
			instancePolicy=row.get('instance_policy'), enabled=row.get('enabled', True),
			offsetDays=row.get('offset_days') or 0, declaredBy=row.get('declared_by'))
		return TupleShaper.deserialize_tenant_based(row, dependency)


TASK_DEPENDENCY_ENTITY_NAME = 'task_dependencies'
TASK_DEPENDENCY_ENTITY_SHAPER = TaskDependencyShaper()


class TaskDependencyService(TaskHubTupleService):
	def get_entity_name(self) -> str:
		return TASK_DEPENDENCY_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TASK_DEPENDENCY_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'dependency_id'

	def get_storable_id(self, storable: TaskDependency) -> TaskDependencyId:
		return storable.dependencyId

	def set_storable_id(self, storable: TaskDependency, storable_id: TaskDependencyId) -> TaskDependency:
		storable.dependencyId = storable_id
		return storable

	def find_all(self, tenant_id: TenantId) -> List[TaskDependency]:
		return self.storage.find(self.get_entity_finder(criteria=tenant_criteria(tenant_id)))

	def find_by_downstream(self, task_id: TaskDefinitionId, tenant_id: TenantId) -> List[TaskDependency]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='downstream_task_id'), right=task_id),
			*tenant_criteria(tenant_id)]))

	def find_by_upstream(self, task_id: TaskDefinitionId, tenant_id: TenantId) -> List[TaskDependency]:
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='upstream_task_id'), right=task_id),
			*tenant_criteria(tenant_id)]))

	def find_pair(
			self, upstream_task_id: TaskDefinitionId, downstream_task_id: TaskDefinitionId, tenant_id: TenantId
	) -> Optional[TaskDependency]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='upstream_task_id'), right=upstream_task_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='downstream_task_id'), right=downstream_task_id),
			*tenant_criteria(tenant_id)]))
