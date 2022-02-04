from watchmen_meta_service.common import StorageService
from watchmen_model.admin import Topic
from watchmen_model.common import TopicId
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI


class TopicIndexService(StorageService):
	def __init__(
			self, storage: TransactionalStorageSPI, snowflake_generator: SnowflakeGenerator
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)

	def build_index(self, topic: Topic) -> None:
		# TODO build topic index
		pass

	def remove_index(self, topic_id: TopicId) -> None:
		# TODO remove topic index
		pass
