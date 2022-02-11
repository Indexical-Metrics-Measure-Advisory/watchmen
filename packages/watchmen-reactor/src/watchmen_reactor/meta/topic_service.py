from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService as TopicStorageService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic
from watchmen_model.common import TopicId
from watchmen_reactor.cache import CacheService


class TopicService:
	def __init__(self, principal_service: PrincipalService):
		self.principal_service = principal_service

	def find_by_id(self, topic_id: TopicId) -> Optional[Topic]:
		topic = CacheService.topic().get(topic_id)
		if topic is not None:
			return topic

		storage_service = TopicStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principal_service)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			topic: Topic = storage_service.find_by_id(topic_id)
			if topic is None:
				return None

			CacheService.topic().put(topic)
			return topic
		finally:
			storage_service.close_transaction()
