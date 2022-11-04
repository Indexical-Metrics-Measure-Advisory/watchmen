from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import TopicSnapshotFrequency, TopicSnapshotScheduler, TopicSnapshotSchedulerId
from watchmen_model.common import DataPage, Pageable, ParameterJoint, TenantId, TopicId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper
from watchmen_utilities import is_not_blank


class TopicSnapshotSchedulerShaper(EntityShaper):
	@staticmethod
	def serialize_filter(a_filter: ParameterJoint) -> Optional[dict]:
		if a_filter is None:
			return None
		elif isinstance(a_filter, dict):
			return a_filter
		else:
			return a_filter.dict()

	def serialize(self, scheduler: TopicSnapshotScheduler) -> EntityRow:
		return TupleShaper.serialize_tenant_based(scheduler, {
			'scheduler_id': scheduler.schedulerId,
			'topic_id': scheduler.topicId,
			'target_topic_name': scheduler.targetTopicName,
			'target_topic_id': scheduler.targetTopicId,
			'pipeline_id': scheduler.pipelineId,
			'frequency': scheduler.frequency,
			'filter': TopicSnapshotSchedulerShaper.serialize_filter(scheduler.filter),
			'weekday': scheduler.weekday,
			'day': scheduler.day,
			'hour': scheduler.hour,
			'minute': scheduler.minute,
			'enabled': True if scheduler.enabled is None else scheduler.enabled
		})

	def deserialize(self, row: EntityRow) -> TopicSnapshotScheduler:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TopicSnapshotScheduler(
			schedulerId=row.get('scheduler_id'),
			topicId=row.get('topic_id'),
			targetTopicName=row.get('target_topic_name'),
			targetTopicId=row.get('target_topic_id'),
			pipelineId=row.get('pipeline_id'),
			frequency=row.get('frequency'),
			filter=row.get('filter'),
			weekday=row.get('weekday'),
			day=row.get('day'),
			hour=row.get('hour'),
			minute=row.get('minute'),
			enabled=row.get('enabled')
		))


TOPIC_SNAPSHOT_SCHEDULER_ENTITY_NAME = 'snapshot_schedulers'
TOPIC_SNAPSHOT_SCHEDULER_ENTITY_SHAPER = TopicSnapshotSchedulerShaper()


class TopicSnapshotSchedulerService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_operation_tuple_type(self) -> str:
		pass  # need implement when should_record_operation is true

	def get_entity_name(self) -> str:
		return TOPIC_SNAPSHOT_SCHEDULER_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TOPIC_SNAPSHOT_SCHEDULER_ENTITY_SHAPER

	def get_storable_id(self, storable: TopicSnapshotScheduler) -> TopicSnapshotSchedulerId:
		return storable.schedulerId

	def set_storable_id(
			self, storable: TopicSnapshotScheduler, storable_id: TopicSnapshotSchedulerId) -> TopicSnapshotScheduler:
		storable.schedulerId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'scheduler_id'

	def find_page_by_topic_and_frequency(
			self, topic_id: Optional[TopicId], frequency: Optional[List[TopicSnapshotFrequency]],
			tenant_id: Optional[TenantId],
			pageable: Pageable
	) -> DataPage:
		criteria = []
		if is_not_blank(topic_id):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.EQUALS, right=topic_id))
		if frequency is not None and len(frequency) != 0:
			if len(frequency) == 1:
				criteria.append(EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='frequency'), operator=EntityCriteriaOperator.EQUALS,
					right=frequency[0]))
			else:
				criteria.append(EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='frequency'), operator=EntityCriteriaOperator.IN,
					right=frequency))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))

	def find_by_topic(self, topic_id: TopicId) -> List[TopicSnapshotScheduler]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.EQUALS, right=topic_id)
		]
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_all(self, tenant_id: Optional[TenantId]) -> List[TopicSnapshotScheduler]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_all_enabled(self) -> List[TopicSnapshotScheduler]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='enabled'), right=True)
		]))
