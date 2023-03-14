from typing import List, Dict, Any, Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.common import IS_POSTED, CHANGE_JSON_ID, TENANT_ID, MODEL_TRIGGER_ID, ask_partial_size
from watchmen_collector_kernel.model import ChangeDataJson
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, ChangeJsonId, Pageable
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	ColumnNameLiteral, EntityCriteriaExpression, EntityStraightValuesFinder, EntityStraightColumn, EntitySortColumn, \
	EntitySortMethod


class ChangeDataJsonShaper(EntityShaper):
	def serialize(self, entity: ChangeDataJson) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity,
		                                          {
			                                          'change_json_id': entity.changeJsonId,
			                                          'resource_id': entity.resourceId,
			                                          'model_name': entity.modelName,
			                                          'object_id': entity.objectId,
			                                          'table_name': entity.tableName,
			                                          'data_id': entity.dataId,
			                                          'content': entity.content,
			                                          'depend_on': entity.dependOn,
			                                          'is_posted': entity.isPosted,
			                                          'result': entity.result,
			                                          'task_id': entity.taskId,
			                                          'table_trigger_id': entity.tableTriggerId,
			                                          'model_trigger_id': entity.modelTriggerId,
			                                          'event_trigger_id': entity.eventTriggerId
		                                          })

	def deserialize(self, row: EntityRow) -> ChangeDataJson:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row,
		                                            ChangeDataJson(
			                                            changeJsonId=row.get('change_json_id'),
			                                            resourceId=row.get('resource_id'),
			                                            modelName=row.get('model_name'),
			                                            objectId=row.get('object_id'),
			                                            tableName=row.get('table_name'),
			                                            dataId=row.get('data_id'),
			                                            content=row.get('content'),
			                                            dependOn=row.get('depend_on'),
			                                            isPosted=row.get('is_posted'),
			                                            result=row.get('result'),
			                                            taskId=row.get('task_id'),
			                                            tableTriggerId=row.get('table_trigger_id'),
			                                            modelTriggerId=row.get('model_trigger_id'),
			                                            eventTriggerId=row.get('event_trigger_id')
		                                            ))


CHANGE_DATA_JSON_TABLE = 'change_data_json'
CHANGE_DATA_JSON_ENTITY_SHAPER = ChangeDataJsonShaper()


class ChangeDataJsonService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return CHANGE_DATA_JSON_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return CHANGE_DATA_JSON_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return 'change_json_id'

	def get_storable_id(self, storable: ChangeDataJson) -> StorableId:
		# noinspection PyTypeChecker
		return storable.changeJsonId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: ChangeDataJson, storable_id: ChangeJsonId) -> Storable:
		storable.changeRecordId = storable_id
		return storable

	def update_change_data_json(self, storable: ChangeDataJson) -> ChangeDataJson:
		self.begin_transaction()
		try:
			self.update(storable)
			self.commit_transaction()
			return storable
		except Exception as e:
			self.rollback_transaction()
			raise e

	def find_not_posted_json(self, model_trigger_id: int) -> List[Dict[str, Any]]:
		self.begin_transaction()
		try:
			return self.storage.find_straight_values(EntityStraightValuesFinder(
				name=self.get_entity_name(),
				shaper=self.get_entity_shaper(),
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_POSTED), right=False),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=MODEL_TRIGGER_ID), right=model_trigger_id)
				],
				straightColumns=[EntityStraightColumn(columnName=CHANGE_JSON_ID),
				                 EntityStraightColumn(columnName=TENANT_ID)]
			))
		finally:
			self.close_transaction()

	def find_partial_json(self, model_trigger_id: int) -> List[ChangeDataJson]:
		self.begin_transaction()
		try:
			return self.storage.page(self.get_entity_pager(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_POSTED), right=False),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=MODEL_TRIGGER_ID),
					                         right=model_trigger_id)
				],
				pageable=Pageable(pageNumber=1, pageSize=ask_partial_size())
			)).data
		finally:
			self.close_transaction()

	def is_existed(self, change_json: ChangeDataJson) -> bool:
		self.begin_transaction()
		try:
			return self.storage.exists(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(
							columnName=self.get_storable_id_column_name()
						),
						right=change_json.changeJsonId)
				]
			))
		finally:
			self.close_transaction()

	def find_json_by_id(self, change_json_id: str) -> ChangeDataJson:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.find_by_id(change_json_id)
		finally:
			self.close_transaction()

	def find_by_resource_id(self, resource_id: str) -> Optional[ChangeDataJson]:
		try:
			self.storage.connect()
			return self.storage.find_one(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='resource_id'), right=resource_id)
				]
			))
		finally:
			self.storage.close()

	def find_by_object_id(self, model_name: str, object_id: str, model_trigger_id: int) -> List:
		try:
			self.storage.connect()
			return self.storage.find(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_name'), right=model_name),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='object_id'), right=object_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_trigger_id'), right=model_trigger_id)
				],
				sort=[EntitySortColumn(name='sequence', method=EntitySortMethod.ASC)]
			))
		finally:
			self.storage.close()

	def is_event_finished(self, event_trigger_id: int) -> bool:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.count(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='event_trigger_id'), right=event_trigger_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_POSTED), right=False)
				]
			)) == 0
		finally:
			self.close_transaction()

	def is_model_finished(self, model_trigger_id: int) -> bool:
		self.begin_transaction()
		try:
			# noinspection PyTypeChecker
			return self.storage.count(self.get_entity_finder(
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='model_trigger_id'), right=model_trigger_id),
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=IS_POSTED), right=False)
				]
			)) == 0
		finally:
			self.close_transaction()


def get_change_data_json_service(storage: TransactionalStorageSPI,
                                 snowflake_generator: SnowflakeGenerator,
                                 principal_service: PrincipalService
                                 ) -> ChangeDataJsonService:
	return ChangeDataJsonService(storage, snowflake_generator, principal_service)
