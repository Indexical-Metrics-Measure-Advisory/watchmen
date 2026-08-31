from typing import List, Optional

from watchmen_meta.common import StorageService, TupleShaper
from watchmen_model.admin import Topic, TopicTag
from watchmen_model.common import TenantId, TopicId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityDeleter, EntityDistinctValuesFinder, EntityFinder, EntityIdHelper, EntityRow, EntityShaper, \
	SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, is_blank


class TopicTagShaper(EntityShaper):
	def serialize(self, topic_tag: TopicTag) -> EntityRow:
		return TupleShaper.serialize_tenant_based(topic_tag, {
			'topic_tag_id': topic_tag.topicTagId,
			'topic_id': topic_tag.topicId,
			'tag_name': topic_tag.tagName,
		})

	def deserialize(self, row: EntityRow) -> TopicTag:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, TopicTag(
			topicTagId=row.get('topic_tag_id'),
			topicId=row.get('topic_id'),
			tagName=row.get('tag_name'),
		))


TOPIC_TAG_ENTITY_NAME = 'topic_tags'
TOPIC_TAG_ENTITY_SHAPER = TopicTagShaper()


class TopicTagService(StorageService):
	"""
	relation rows of topic and tag, fully owned by the topic,
	therefore they are replaced as a whole on every topic save.
	"""

	def __init__(
			self, storage: TransactionalStorageSPI, snowflake_generator: SnowflakeGenerator
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)

	def get_entity_name(self) -> str:
		return TOPIC_TAG_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TOPIC_TAG_ENTITY_SHAPER

	def build_topic_tag(self, topic: Topic, tag_name: str) -> TopicTag:
		now = get_current_time_in_seconds()
		return TopicTag(
			topicTagId=str(self.snowflakeGenerator.next_id()),
			topicId=topic.topicId,
			tagName=tag_name,
			tenantId=topic.tenantId,
			createdAt=now,
			createdBy=topic.lastModifiedBy,
			lastModifiedAt=now,
			lastModifiedBy=topic.lastModifiedBy
		)

	def save_topic_tags(self, topic: Topic) -> None:
		self.remove_topic_tags(topic.topicId)
		# dedupe with an equals function, the no-argument distinct() relies on a set and loses order
		tags = ArrayHelper(topic.tags or []) \
			.filter(lambda x: x is not None and len(x.strip()) != 0) \
			.map(lambda x: x.strip()) \
			.distinct(lambda a, b: a == b) \
			.to_list()
		for tag_name in tags:
			# noinspection PyTypeChecker
			self.storage.insert_one(self.build_topic_tag(topic, tag_name), EntityIdHelper(
				name=self.get_entity_name(),
				shaper=self.get_entity_shaper(),
				idColumnName='topic_tag_id'
			))

	def remove_topic_tags(self, topic_id: TopicId) -> None:
		self.storage.delete(EntityDeleter(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='topic_id'), right=topic_id)]
		))

	def find_by_topic_id(self, topic_id: TopicId) -> List[TopicTag]:
		# noinspection PyTypeChecker
		return self.storage.find(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='topic_id'), right=topic_id)]
		))

	def find_by_topic_ids(self, topic_ids: List[TopicId]) -> List[TopicTag]:
		if len(topic_ids) == 0:
			return []
		# noinspection PyTypeChecker
		return self.storage.find(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='topic_id'), operator=EntityCriteriaOperator.IN, right=topic_ids)
			]
		))

	def find_distinct_tags(self, tenant_id: Optional[TenantId]) -> List[str]:
		"""
		all distinct tag names used by tenant topics, sorted, deduplicated on the database side
		"""
		criteria = []
		if not is_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		rows: List[TopicTag] = self.storage.find_distinct_values(EntityDistinctValuesFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=criteria,
			distinctColumnNames=['tag_name']
		))
		return ArrayHelper(rows).map(lambda x: x.tagName).filter(lambda x: x is not None).to_list()
