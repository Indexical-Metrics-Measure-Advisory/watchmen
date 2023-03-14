from typing import Optional, List, Any, Dict

from watchmen_collector_kernel.common import ask_partial_size
from watchmen_utilities import ArrayHelper

from watchmen_collector_kernel.model.scheduled_task import Dependence

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ScheduledTaskId, Pageable
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, \
	EntityCriteriaExpression, ColumnNameLiteral, SnowflakeGenerator, EntitySortColumn, EntitySortMethod, \
	EntityCriteriaJoint, EntityStraightValuesFinder, EntityStraightColumn


class ScheduledTaskShaper(EntityShaper):

	@staticmethod
	def serialize_dependence(dependence: Dependence) -> dict:
		if isinstance(dependence, dict):
			return dependence
		else:
			return dependence.dict()

	@staticmethod
	def serialize_depend_on(depend_on: Optional[List[Dependence]]) -> Optional[list]:
		if depend_on is None:
			return None
		return ArrayHelper(depend_on).map(lambda x: ScheduledTaskShaper.serialize_dependence(x)).to_list()

	def serialize(self, entity: ScheduledTask) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'task_id': entity.taskId,
			'resource_id': entity.resourceId,
			'topic_code': entity.topicCode,
			'content': entity.content,
			'model_name': entity.modelName,
			'object_id': entity.objectId,
			'depend_on': ScheduledTaskShaper.serialize_depend_on(entity.dependOn),
			'parent_task_id': entity.parentTaskId,
			'tenant_id': entity.tenantId,
			'is_finished': entity.isFinished,
			'result': entity.result
		})

	def deserialize(self, row: EntityRow) -> ScheduledTask:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, ScheduledTask(
			taskId=row.get('task_id'),
			resourceId=row.get('resource_id'),
			topicCode=row.get('topic_code'),
			content=row.get('content'),
			modelName=row.get('model_name'),
			objectId=row.get('object_id'),
			dependOn=row.get('depend_on'),
			parentTaskId=row.get('parent_task_id'),
			tenantId=row.get('tenant_id'),
			isFinished=row.get('is_finished'),
			result=row.get('result')
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

	def find_task_by_id(self, task_id: ScheduledTaskId) -> Optional[ScheduledTask]:
		self.begin_transaction()
		try:
			return self.find_by_id(task_id)
		finally:
			self.close_transaction()

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
				pageable=Pageable(pageNumber=1, pageSize=ask_partial_size())
			)).data
		finally:
			self.close_transaction()

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


def get_scheduled_task_service(storage: TransactionalStorageSPI,
                               snowflake_generator: SnowflakeGenerator,
                               principal_service: PrincipalService
                               ) -> ScheduledTaskService:
	return ScheduledTaskService(storage, snowflake_generator, principal_service)
