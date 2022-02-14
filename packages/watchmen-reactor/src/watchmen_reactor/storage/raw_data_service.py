from typing import Any, Dict

from watchmen_reactor.common import ReactorException
from watchmen_reactor.topic_schema import ColumnNames, TopicSchema
from watchmen_storage import EntityRow, EntityShaper
from .data_service import TopicDataEntityHelper, TopicDataService


class RawTopicShaper(EntityShaper):
	def __init__(self, topic_schema: TopicSchema):
		pass

	def serialize(self, data: EntityRow) -> EntityRow:
		return {
			ColumnNames.ID: data.get(ColumnNames.ID),
			ColumnNames.RAW_TOPIC_DATA: data.get(ColumnNames.RAW_TOPIC_DATA),
			ColumnNames.TENANT_ID: data.get(ColumnNames.TENANT_ID),
			ColumnNames.INSERT_TIME: data.get(ColumnNames.INSERT_TIME),
			ColumnNames.UPDATE_TIME: data.get(ColumnNames.UPDATE_TIME)
		}

	def deserialize(self, row: EntityRow) -> EntityRow:
		return row


class RawTopicDataEntityHelper(TopicDataEntityHelper):
	def create_entity_shaper(self, topic_schema: TopicSchema) -> EntityShaper:
		return RawTopicShaper(topic_schema)


class RawTopicDataService(TopicDataService):
	def create_data_entity_helper(self, topic_schema: TopicSchema) -> TopicDataEntityHelper:
		return RawTopicDataEntityHelper(topic_schema)

	def create(self, data: Dict[str, Any]):
		try:
			self.get_storage().insert_one(data, self.get_entity_helper())
		except Exception as e:
			topic = self.get_topic()
			raise ReactorException(f'Failed to create data[{data}] on topic[id={topic.topicId}, name={topic.name}].')

	def find(self, data: Dict[str, Any]):
		pass

	def update(self, data: Dict[str, Any]):
		pass

	def delete(self, data: Dict[str, Any]):
		pass
