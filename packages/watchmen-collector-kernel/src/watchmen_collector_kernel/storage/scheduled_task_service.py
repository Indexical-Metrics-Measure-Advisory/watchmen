from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import ScheduledTask
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ScheduledTaskId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, \
	EntityCriteriaExpression, ColumnNameLiteral, SnowflakeGenerator, EntityList, EntitySortColumn, EntitySortMethod, \
	EntityCriteriaJoint, EntityCriteriaJointConjunction


class ScheduledTaskShaper(EntityShaper):
	def serialize(self, entity: ScheduledTask) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'task_id': entity.taskId,
			'resource_id': entity.resourceId,
			'content': entity.content,
			'model_name': entity.modelName,
			'object_id': entity.objectId,
			'tenant_id': entity.tenantId,
			'status': entity.status,
			'result': entity.result
		})

	def deserialize(self, row: EntityRow) -> ScheduledTask:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, ScheduledTask(
			taskId=row.get('task_id'),
			resourceId=row.get('resource_id'),
			content=row.get('content'),
			modelName=row.get('model_name'),
			objectId=row.get('object_id'),
			tenantId=row.get('tenant_id'),
			status=row.get('status'),
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

	def update_result_by_task_id(self, task_id: ScheduledTaskId, status: int, result: str):
		self.storage.update(self.get_entity_updater(
			criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='task_id'), right=task_id)],
			update={'status': status,
			        'result': result}
		))

	def find_by_dependency(self, model_name: str, object_id: str) -> int:
		return self.storage.count(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='object_id'), right=object_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'), right=model_name),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=0)
		]))

	def count_by_resource_id(self, resource_id: str) -> int:
		return self.storage.count(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='resource_id'), right=resource_id)
		]))

	def find_all_not_complete_task_ids(self) -> EntityList:
		return self.storage.find_distinct_values(self.get_entity_finder_for_columns(
			criteria=[EntityCriteriaJoint(
				conjunction=EntityCriteriaJointConjunction.OR,
				children=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='status'), right=3),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName='status'), right=0)
				]
			)],
			distinctColumnNames=['task_id', 'resource_id', 'tenant_id'],
			distinctValueOnSingleColumn=False,
			sort=[EntitySortColumn(name='resource_id', method=EntitySortMethod.ASC)]
		))


def get_scheduled_task_service(storage: TransactionalStorageSPI,
                               snowflake_generator: SnowflakeGenerator,
                               principal_service: PrincipalService
                               ) -> ScheduledTaskService:
	return ScheduledTaskService(storage, snowflake_generator, principal_service)
