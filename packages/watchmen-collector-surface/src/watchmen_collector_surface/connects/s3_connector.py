from logging import getLogger
from threading import Thread
from typing import Any, Optional

from time import sleep
from watchmen_collector_kernel.model.scheduled_task import Dependence, ScheduledTask
from watchmen_collector_kernel.service.lock_helper import get_resource_lock, try_lock_nowait, unlock
from watchmen_collector_kernel.storage import get_scheduled_task_service, get_competitive_lock_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_model.common import SettingsModel
from watchmen_storage_s3 import SimpleStorageService

logger = getLogger(__name__)

identifier_delimiter = "~"


class S3CollectorSettings(SettingsModel):
	access_key_id: str
	secret_access_key: str
	bucket_name: str
	region: str
	token: str
	tenant_id: str
	consume_prefix: str
	dead_prefix: str
	max_keys: int = 10
	clean_task_interval: int = 3600


def init_s3_collector(settings: S3CollectorSettings):
	S3Connector(settings).create_thread()


class S3Connector:

	def __init__(self, settings: S3CollectorSettings):
		self.simpleStorageService = SimpleStorageService(
			access_key_id=settings.access_key_id,
			access_key_secret=settings.secret_access_key,
			endpoint=settings.region,
			bucket_name=settings.bucket_name,
			params=None)
		self.token = settings.token
		self.tenant_id = settings.tenant_id
		self.consume_prefix = settings.consume_prefix
		self.dead_prefix = settings.dead_prefix
		self.maxKeys = settings.max_keys
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principle_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principle_service)

	def create_thread(self) -> None:
		Thread(target=S3Connector.run, args=(self,), daemon=True).start()

	def run(self):
		try:
			while True:
				objects = self.simpleStorageService.list_objects(max_keys=self.maxKeys, prefix=self.consume_prefix)
				logger.info("objects size {}".format(len(objects)))
				if len(objects) == 0:
					sleep(5)
				else:
					for object_ in objects:
						lock = get_resource_lock(str(self.snowflake_generator.next_id()),
						                         object_.key,
						                         self.tenant_id)
						try:
							if try_lock_nowait(self.competitive_lock_service, lock):
								existed_task = self.scheduled_task_service.find_by_resource_id(object_.key)
								if existed_task:
									continue
								else:
									self.scheduled_task_service.create_task(self.get_task(object_))
									self.simpleStorageService.delete_object(object_.key)
						finally:
							unlock(self.competitive_lock_service, lock)
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(60)
			self.create_thread()

	# noinspection PyMethodMayBeStatic
	def get_dependency(self, object_: Any) -> Optional[Dependence]:
		object_key = object_.key.removeprefix(self.consume_prefix)
		key_parts = object_key.split(identifier_delimiter)
		if len(key_parts) == 5:
			return Dependence(modelName=key_parts[3], objectId=key_parts[4])
		elif len(key_parts) == 3:
			return Dependence(modelName=key_parts[1], objectId=key_parts[2])
		else:
			return None

	def get_model_name(self, object_: Any) -> str:
		object_key = object_.key.removeprefix(self.consume_prefix)
		key_parts = object_key.split(identifier_delimiter)
		return key_parts[1]

	def get_object_id(self, object_: Any) -> str:
		object_key = object_.key.removeprefix(self.consume_prefix)
		key_parts = object_key.split(identifier_delimiter)
		return key_parts[2]

	def get_task(self, object_: Any) -> ScheduledTask:
		return ScheduledTask(taskId=self.snowflake_generator.next_id(),
		                     resourceId=object_.key,
		                     content=self.simpleStorageService.get_object(object_.key),
		                     modelName=self.get_model_name(object_),
		                     objectId=self.get_object_id(object_),
		                     dependencies=[self.get_dependency(object_)],
		                     status=0,
		                     result=None)

	# noinspection PyMethodMayBeStatic
	def get_code(self, identifier: str) -> str:
		key_parts = identifier.split(identifier_delimiter)
		return 'raw_' + key_parts[1].lower()
