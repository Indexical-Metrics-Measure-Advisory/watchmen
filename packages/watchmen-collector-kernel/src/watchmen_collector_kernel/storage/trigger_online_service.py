from typing import List, Dict, Any, Optional

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import TriggerEvent, QueryParam, TriggerOnline
from watchmen_meta.common import TupleShaper, TupleService
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable, EventTriggerId, TenantId, Pageable, DataPage
from watchmen_model.common.tuple_ids import OnlineTriggerId
from watchmen_storage import EntityName, EntityRow, EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, \
	EntityStraightValuesFinder, EntityCriteriaExpression, ColumnNameLiteral, \
	EntityStraightColumn, EntitySortColumn, EntitySortMethod, EntityLimitedFinder, EntityCriteriaJoint, \
	EntityCriteriaJointConjunction, EntityCriteriaOperator
from watchmen_utilities import ArrayHelper



class TriggerOnlineShaper(EntityShaper):

	def serialize(self, entity: TriggerOnline) -> EntityRow:
		return TupleShaper.serialize_tenant_based(entity, {
			'online_trigger_id': entity.onlineTriggerId,
			'status': entity.status,
			'code': entity.code,
			'record': entity.record,
			'trace_id': entity.traceId,
			'result': entity.result
		})

	def deserialize(self, row: EntityRow) -> TriggerOnline:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TriggerOnline(
			onlineTriggerId=row.get('online_trigger_id'),
			status=row.get('status'),
			code=row.get('code'),
			record=row.get('record'),
			traceId=row.get('trace_id'),
			result=row.get('result')
		))


TRIGGER_ONLINE_TABLE = 'trigger_online'
TRIGGER_ONLINE_ENTITY_SHAPER = TriggerOnlineShaper()


class TriggerOnlineService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> EntityName:
		return TRIGGER_ONLINE_TABLE

	def get_entity_shaper(self) -> EntityShaper:
		return TRIGGER_ONLINE_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> EntityName:
		return 'online_trigger_id'

	def get_storable_id(self, storable: TriggerOnline) -> StorableId:
		# noinspection PyTypeChecker
		return storable.onlineTriggerId

	def set_storable_id(
			self, storable: TriggerOnline, storable_id: OnlineTriggerId) -> Storable:
		storable.onlineTriggerId = storable_id
		return storable

	def create_trigger_online(self, trigger_online: TriggerOnline) -> TriggerOnline:
		self.begin_transaction()
		try:
			result = self.create(trigger_online)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return result
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def update_trigger_online(self, trigger_online: TriggerOnline) -> Optional[TriggerOnline]:
		self.begin_transaction()
		try:
			result = self.update(trigger_online)
			self.commit_transaction()
			# noinspection PyTypeChecker
			return result
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def find_trigger_by_id(self, online_trigger_id: OnlineTriggerId) -> TriggerOnline:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find_by_id(online_trigger_id, self.get_entity_id_helper())
		finally:
			self.storage.close()

	def find_unfinished_triggers(self) -> List[Dict[str, Any]]:
		self.begin_transaction()
		try:
			return self.storage.find_straight_values(EntityStraightValuesFinder(
				name=self.get_entity_name(),
				criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='status'), right=0)],
				straightColumns=[EntityStraightColumn(columnName=self.get_storable_id_column_name()),
				                 EntityStraightColumn(columnName='tenant_id')],
				sort=[EntitySortColumn(name=self.get_storable_id_column_name(), method=EntitySortMethod.ASC)]
			))
		finally:
			self.close_transaction()


def get_trigger_online_service(storage: TransactionalStorageSPI,
                              snowflake_generator: SnowflakeGenerator,
                              principal_service: PrincipalService
                              ) -> TriggerOnlineService:
	return TriggerOnlineService(storage, snowflake_generator, principal_service)
