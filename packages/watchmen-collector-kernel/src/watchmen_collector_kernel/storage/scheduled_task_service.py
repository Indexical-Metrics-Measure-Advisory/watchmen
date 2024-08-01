from datetime import datetime
from typing import Optional, List, Any, Dict

from watchmen_collector_kernel.common import ask_task_partial_size, STATUS
from watchmen_utilities import ArrayHelper

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ScheduledTaskId, Pageable
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, \
	EntityCriteriaExpression, ColumnNameLiteral, SnowflakeGenerator, EntitySortColumn, EntitySortMethod, \
	EntityCriteriaJoint, EntityStraightValuesFinder, EntityStraightColumn, EntityLimitedFinder, EntityCriteriaOperator


class ScheduledTaskShaper(EntityShaper):

	def serialize(self, entity: ScheduledTask) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'task_id': entity.taskId,
			'resource_id': entity.resourceId,
			'topic_code': entity.topicCode,
			'content': entity.content,
			'change_json_ids': entity.changeJsonIds,
			'model_name': entity.modelName,
			'object_id': entity.objectId,
			'depend_on': ArrayHelper(entity.dependOn).map(lambda x: x.to_dict()).to_list(),
			'parent_task_id': entity.parentTaskId,
			'tenant_id': entity.tenantId,
			'is_finished': entity.isFinished,
			'status': entity.status,
			'result': entity.result,
			'event_id': entity.eventId,
			'pipeline_id': entity.pipelineId,
			'type': entity.type
		})

	def deserialize(self, row: EntityRow) -> ScheduledTask:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, ScheduledTask(
			taskId=row.get('task_id'),
			resourceId=row.get('resource_id'),
			topicCode=row.get('topic_code'),
			content=row.get('content'),
			changeJsonIds=row.get('change_json_ids'),
			modelName=row.get('model_name'),
			objectId=row.get('object_id'),
			dependOn=row.get('depend_on'),
			parentTaskId=row.get('parent_task_id'),
			tenantId=row.get('tenant_id'),
			isFinished=row.get('is_finished'),
			status=row.get('status'),
			result=row.get('result'),
			eventId=row.get('event_id'),
			pipelineId=row.get('pipeline_id'),
			type=row.get('type')
		))


SCHEDULED_TASK_TABLE = 'scheduled_task'
SCHEDULED_TASK_ENTITY_SHAPER = ScheduledTaskShaper()


class ScheduledTaskService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return SCHEDULED_TASK_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return SCHEDULED_TASK_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'task_id'

	def get_storable_id(self, storable: ScheduledTask) -> StorableId:
		return storable.taskId

	def set_storable_id(
			self, storable: ScheduledTask, storable_id: ScheduledTaskId) -> Storable:
		storable.taskId = storable_id
		return storable

	def create_task(self, task: ScheduledTask) -> ScheduledTask:
		self.begin_transaction()
		try:
			task = self.create(task)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return task
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def update_task(self, task: ScheduledTask) -> ScheduledTask:
		self.begin_transaction()
		try:
			task = self.update(task)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return task
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def find_task_by_id(self, task_id: ScheduledTaskId) -> Optional[ScheduledTask]:
		self.begin_transaction()
		try:
			return self.find_by_id(task_id)
		finally:
			self.close_transaction()

	def find_and_lock_by_id(self, task_id: int) -> Optional[ScheduledTask]:
		row = self.storage.find_and_lock_by_id(task_id, self.get_entity_id_helper())
		if row:
			entity = self.get_entity_shaper().deserialize(row)
			# noinspection PyTypeChecker
			return entity
		else:
			return None

	def find_one_and_lock_nowait(self, task_id: int) -> Optional[ScheduledTask]:
		return self.storage.find_one_and_lock_nowait(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=0),
			])
		)

	def find_unfinished_tasks(self) -> List[Dict[str, Any]]:
		self.begin_transaction()
		try:
			return self.storage.find_straight_values(EntityStraightValuesFinder(
				name=self.get_entity_name(),
				criteria=[EntityCriteriaJoint(
					children=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='is_finished'), right=False)
					]
				)],
				straightColumns=[EntityStraightColumn(columnName='task_id'),
				                 EntityStraightColumn(columnName='resource_id'),
				                 EntityStraightColumn(columnName='tenant_id')],
				sort=[EntitySortColumn(name='resource_id', method=EntitySortMethod.ASC)]
			))
		finally:
			self.close_transaction()

	def find_partial_tasks(self) -> List[ScheduledTask]:
		self.begin_transaction()
		try:
			return self.storage.page(self.get_entity_pager(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='is_finished'), right=False)
				],
				pageable=Pageable(pageNumber=1, pageSize=ask_task_partial_size())
			)).data
		finally:
			self.close_transaction()

	def find_tasks_and_locked(self, limit: int = None) -> List:
		return self.storage.find_for_update_skip_locked(
			EntityLimitedFinder(
				name=self.get_entity_name(),
				shaper=self.get_entity_shaper(),
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=STATUS), right=0)
				],
				limit=limit if limit is not None else ask_task_partial_size()
			))

	def is_existed(self, task: ScheduledTask) -> bool:
		self.begin_transaction()
		try:
			return self.storage.exists(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(
							columnName=self.get_storable_id_column_name()
						),
						right=task.taskId)
				]
			))
		finally:
			self.close_transaction()

	def find_by_resource_id(self, resource_id: str) -> List[Dict[str, Any]]:
		self.begin_transaction()
		try:
			return self.storage.find_straight_values(EntityStraightValuesFinder(
				name=self.get_entity_name(),
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='resource_id'), right=resource_id)],
				straightColumns=[EntityStraightColumn(columnName='task_id'),
				                 EntityStraightColumn(columnName='resource_id'),
				                 EntityStraightColumn(columnName='tenant_id')]
			))
		finally:
			self.close_transaction()

	def find_model_dependent_tasks(self, model_name: str, object_id: str, event_id: str, tenant_id: str) -> List[ScheduledTask]:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.find(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'),
					                         right=model_name),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='object_id'),
					                         right=object_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_id'),
					                         right=event_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
					                         right=tenant_id)
				],
				sort=[EntitySortColumn(name='task_id', method=EntitySortMethod.ASC)]
			))
		finally:
			self.close_transaction()

	def is_dependent_task_finished(self, model_name: str, object_id: str, tenant_id: str) -> bool:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.count(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'),
					                         right=model_name),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='object_id'),
					                         right=object_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='is_finished'),
					                         right=False),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
					                         right=tenant_id)
				]
			)) == 0
		finally:
			self.close_transaction()

	def count_scheduled_task(self, event_trigger_id: int) -> int:
		return self.storage.count(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_id'),
				                         right=event_trigger_id)
			]
		))

	def find_timeout_task(self, query_time: datetime) -> List:
		try:
			self.storage.connect()
			return self.storage.find(self.get_entity_finder(criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='last_modified_at'),
					operator=EntityCriteriaOperator.LESS_THAN, right=query_time),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=1)
			]))
		finally:
			self.storage.close()

	def is_model_finished(self, model_name: str, event_id: str) -> bool:
		try:
			self.begin_transaction()
			results = self.storage.find_limited(
				EntityLimitedFinder(
					name=self.get_entity_name(),
					shaper=self.get_entity_shaper(),
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'), right=model_name),
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_id'), right=event_id)
					],
					limit=1
				)
			)
			self.commit_transaction()
			if len(results) == 0:
				return True
			else:
				return False
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def is_event_finished(self, event_id: str) -> bool:
		try:
			self.begin_transaction()
			results = self.storage.find_limited(
				EntityLimitedFinder(
					name=self.get_entity_name(),
					shaper=self.get_entity_shaper(),
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_id'), right=event_id)
					],
					limit=1
				)
			)
			self.commit_transaction()
			if len(results) == 0:
				return True
			else:
				return False
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()


def get_scheduled_task_service(storage: TransactionalStorageSPI,
                               snowflake_generator: SnowflakeGenerator,
                               principal_service: PrincipalService
                               ) -> ScheduledTaskService:
	return ScheduledTaskService(storage, snowflake_generator, principal_service)
