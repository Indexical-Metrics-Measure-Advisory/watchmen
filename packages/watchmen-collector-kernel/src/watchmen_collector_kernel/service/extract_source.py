from typing import Optional, List, Dict, Any

from watchmen_auth import PrincipalService
from .extract_utils import build_criteria_by_primary_key
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_data_kernel.service import ask_topic_storage, ask_topic_data_service
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Topic, TopicKind
from watchmen_storage import EntityCriteria, EntityStraightColumn
from watchmen_utilities import get_current_time_in_seconds, ArrayHelper


class SourceTableExtractor:

	def __init__(self, config: CollectorTableConfig, principal_service: PrincipalService):
		self.config = config
		self.principal_service = principal_service
		self.topic = self.fake_extracted_table_to_topic(self.config)
		self.storage = ask_topic_storage(self.topic, self.principal_service)
		self.storage.register_topic(self.topic)
		self.service = ask_topic_data_service(TopicSchema(self.topic), self.storage, principal_service)

	# noinspection PyMethodMayBeStatic
	def fake_topic_id(self, config_id: str) -> str:
		return f'f-{config_id}'

	def fake_extracted_table_to_topic(self, config: CollectorTableConfig) -> Topic:
		#  Fake synonym topic to visit source table
		topic = Topic(topicId=self.fake_topic_id(config.configId),
		              name=config.tableName,
		              dataSourceId=config.dataSourceId,
		              kind=TopicKind.SYNONYM,
		              tenantId=self.principal_service.tenantId
		              )
		topic_storage = ask_topic_storage(topic, self.principal_service)
		factors = topic_storage.ask_synonym_factors(config.tableName)
		topic.factors = factors
		now = get_current_time_in_seconds()
		topic.createdAt = now
		topic.createdBy = self.principal_service.get_user_id()
		topic.lastModifiedAt = now
		topic.lastModifiedBy = self.principal_service.get_user_id()
		return topic

	def find_change_data(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		return self.lower_key(self.service.find_straight_values(
			criteria=criteria,
			columns=ArrayHelper(self.config.primaryKey).map(
				lambda column_name: EntityStraightColumn(columnName=column_name)
			).to_list()
		))

	def find_by_id(self, data_id: Dict) -> Optional[Dict[str, Any]]:
		results = self.service.find(build_criteria_by_primary_key(data_id))
		if len(results) == 1:
			return self.lower_key(results)[0]
		elif len(results) == 0:
			return None
		else:
			raise RuntimeError(f'too many results with {data_id} find')

	def find(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		return self.lower_key(self.service.find(criteria))

	def exists(self, criteria: EntityCriteria) -> bool:
		return self.service.exists(criteria)

	# noinspection PyMethodMayBeStatic
	def lower_key(self, data_: List) -> Optional[List[Dict]]:
		return ArrayHelper(data_).map(
			lambda row: {k.lower(): v for k, v in row.items()}).to_list()
