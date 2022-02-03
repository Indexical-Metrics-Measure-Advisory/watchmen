from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.admin import Topic
from watchmen_model.common import TopicId
from watchmen_storage import EntityRow, EntityShaper


class TopicShaper(EntityShaper):
	def serialize(self, topic: Topic) -> EntityRow:
		return TupleShaper.serialize_tenant_based(topic, {
			'topic_id': topic.topicId,
			'name': topic.name,
			'description': topic.description,
			'type': topic.type,
			'kind': topic.kind,
			'data_source_id': topic.dataSourceId,
			'factors': topic.factors
		})

	def deserialize(self, row: EntityRow) -> Topic:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Topic(
			topicId=row.get('topic_id'),
			name=row.get('name'),
			description=row.get('description'),
			type=row.get('type'),
			kind=row.get('kind'),
			dataSourceId=row.get('data_source_id'),
			factors=row.get('factors')
		))


TOPIC_ENTITY_NAME = 'topics'
TOPIC_ENTITY_SHAPER = TopicShaper()


class TopicService(TupleService):
	def get_entity_name(self) -> str:
		return TOPIC_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TOPIC_ENTITY_SHAPER

	def get_tuple_id(self, a_tuple: Topic) -> TopicId:
		return a_tuple.topicId

	def set_tuple_id(self, a_tuple: Topic, tuple_id: TopicId) -> Topic:
		a_tuple.topicId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'topic_id'
