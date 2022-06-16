from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.cache import CacheService
from watchmen_data_kernel.common import DataKernelException
from watchmen_data_kernel.topic_schema import TopicSchema
from watchmen_meta.admin import TopicService as TopicStorageService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, TopicKind
from watchmen_model.common import TenantId, TopicId
from watchmen_utilities import ArrayHelper


class TopicService:
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def find_by_id(self, topic_id: TopicId) -> Optional[Topic]:
		topic = CacheService.topic().get(topic_id)
		if topic is not None:
			if topic.tenantId != self.principalService.get_tenant_id():
				raise DataKernelException(
					f'Topic[id={topic_id}] not belongs to current tenant[id={self.principalService.get_tenant_id()}].')
			return topic

		storage_service = TopicStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
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

	def find_schema_by_id(self, topic_id: TopicId, tenant_id: TenantId) -> Optional[TopicSchema]:
		if not self.principalService.is_super_admin():
			if self.principalService.get_tenant_id() != tenant_id:
				raise Exception('Forbidden')

		schema = CacheService.topic().get_schema(topic_id)
		if schema is not None:
			if schema.get_topic().tenantId != tenant_id:
				return None
			return schema

		storage_service = TopicStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			topic: Topic = storage_service.find_by_id(topic_id)
			if topic is None:
				return None

			CacheService.topic().put(topic)
			schema = CacheService.topic().get_schema(topic.topicId)
			if schema is not None:
				if schema.get_topic().tenantId != tenant_id:
					return None
			return schema
		finally:
			storage_service.close_transaction()

	def find_schema_by_name(self, name: str, tenant_id: TenantId) -> Optional[TopicSchema]:
		if not self.principalService.is_super_admin():
			if self.principalService.get_tenant_id() != tenant_id:
				raise Exception('Forbidden')

		schema = None
		topic = CacheService.topic().get_by_name(name, tenant_id)
		if topic is not None:
			schema = CacheService.topic().get_schema(topic.topicId)
		if schema is not None:
			return schema

		storage_service = TopicStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			topic: Topic = storage_service.find_by_name_and_tenant(name, tenant_id)
			if topic is None:
				return None

			CacheService.topic().put(topic)
			return CacheService.topic().get_schema(topic.topicId)
		finally:
			storage_service.close_transaction()

	def find_should_monitored(self, tenant_id: TenantId) -> List[Topic]:
		storage_service = TopicStorageService(ask_meta_storage(), ask_snowflake_generator(), self.principalService)
		storage_service.begin_transaction()
		try:
			# noinspection PyTypeChecker
			topics = storage_service.find_all(tenant_id)
			# only business topics need to be monitored
			return ArrayHelper(topics).filter(lambda x: x.kind == TopicKind.BUSINESS).to_list()
		finally:
			storage_service.close_transaction()
