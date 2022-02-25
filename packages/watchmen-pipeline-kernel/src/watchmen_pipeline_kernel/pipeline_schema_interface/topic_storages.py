from abc import abstractmethod

from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_storage import TopicDataStorageSPI


# noinspection PyClassHasNoInit
class TopicStorages:
	@abstractmethod
	def ask_topic_storage(self, schema: TopicSchema) -> TopicDataStorageSPI:
		pass
