from datetime import datetime
from typing import Optional, List, Dict, Any

from watchmen_auth import PrincipalService
from watchmen_collector_kernel.model import CollectorTableConfig
from watchmen_data_kernel.service import ask_topic_storage, ask_topic_data_service
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_model.admin import Topic, TopicKind
from watchmen_storage import EntityCriteriaExpression, ColumnNameLiteral, EntityCriteriaOperator, \
	EntityDistinctValuesFinder, EntityCriteria
from watchmen_utilities import get_current_time_in_seconds


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

	def find_change_data_ids(self, start_time: datetime, end_time: datetime) -> Optional[List[Dict[str, Any]]]:
		try:
			self.storage.connect()
			return self.service.find_distinct_values(
				criteria=[
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName=self.config.auditColumn),
						operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
						right=start_time),
					EntityCriteriaExpression(
						left=ColumnNameLiteral(columnName=self.config.auditColumn),
						operator=EntityCriteriaOperator.LESS_THAN_OR_EQUALS,
						right=end_time)
				],
				column_names=[self.config.primaryKey],
				distinct_value_on_single_column=False
			)
		finally:
			self.storage.close()

	def find_by_data_id(self, pk_column: str, data_id: str) -> Optional[Dict[str, Any]]:
		try:
			self.storage.connect()
			results = self.service.find(
				[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName=pk_column), right=data_id)
				]
			)
			if len(results) == 1:
				return results[0]
			else:
				raise RuntimeError(f'too many results with find_one()')
		finally:
			self.storage.close()

	def find(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		try:
			self.storage.connect()
			return self.service.find(criteria)
		finally:
			self.storage.close()

	def find_ids(self, criteria: EntityCriteria) -> List[Dict[str, Any]]:
		try:
			self.storage.connect()
			return self.service.find_distinct_values(EntityDistinctValuesFinder(
				criteria=criteria,
				distinctColumnNames=[self.config.primaryKey],
				distinctValueOnSingleColumn=False
			))
		finally:
			self.storage.close()
