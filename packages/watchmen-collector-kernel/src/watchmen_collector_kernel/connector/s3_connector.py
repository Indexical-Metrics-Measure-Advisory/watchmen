from logging import getLogger
from threading import Thread
from time import sleep
from typing import Optional

from watchmen_collector_kernel.common import S3CollectorSettings
from watchmen_collector_kernel.lock import get_lock_service, get_unique_key_distributed_lock
from watchmen_collector_kernel.model import ResourceLock, Dependency
from watchmen_collector_kernel.service import S3Consumer
from watchmen_meta.common import ask_snowflake_generator
from watchmen_storage_s3 import SimpleStorageService
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)

key_delimiter = "~"


def init_s3_collector(settings: S3CollectorSettings):
	S3Connector(settings).create_connector()


class S3Connector:
	
	def __init__(self, settings: S3CollectorSettings):
		self.simpleStorageService = SimpleStorageService(access_key_id=settings.access_key_id,
		                                                 access_key_secret=settings.secret_access_key,
		                                                 endpoint=settings.region,
		                                                 bucket_name=settings.bucket_name,
		                                                 params=None)
		self.s3Consumer = S3Consumer(self.simpleStorageService)
		self.lock_service = get_lock_service()
		self.snowflakeGenerator = ask_snowflake_generator()
		self.token = settings.token
	
	def create_connector(self) -> None:
		Thread(target=S3Connector.run, args=(self,), daemon=True).start()
	
	def run(self):
		while True:
			objects = self.simpleStorageService.list_objects()
			print(len(objects))
			ArrayHelper(objects).each(self.consume)
			sleep(5)
	
	def consume(self, object_):
		if self.validate_key_pattern(object_.key):
			distributed_lock = get_unique_key_distributed_lock(self.get_resource_lock(object_.key), self.lock_service)
			dependency = self.get_dependency(object_.key)
			if self.s3Consumer.ask_lock(distributed_lock):
				try:
					if self.check_dependency_finished(dependency):
						self.s3Consumer.process(object_.key, self.get_code(object_.key), self.token)
					else:
						logger.info("Dependency is not finished %s", object_.key)
				except Exception as e:
					logger.error("process object %s error", object_.key, exc_info=1)
				finally:
					self.s3Consumer.ask_unlock(distributed_lock)
		else:
			logger.error("The key pattern is not correct, %s", object_.key)
	
	def get_resource_lock(self, key: str) -> ResourceLock:
		key_parts = key.split(key_delimiter)
		return ResourceLock(lockId=self.snowflakeGenerator.next_id(),
		                    resourceId=key,
		                    modelName=key_parts[1],
		                    objectId=key_parts[2])
	
	def get_dependency(self, key: str) -> Optional[Dependency]:
		key_parts = key.split(key_delimiter)
		if len(key_parts) == 5:
			return Dependency(model_name=key_parts[3], object_id=key_parts[4])
		else:
			return None
	
	def check_dependency_finished(self, dependency: Optional[Dependency]) -> bool:
		if dependency:
			data = self.lock_service.find_by_dependency(dependency.model_name, dependency.object_id)
			if len(data) == 0:
				return True
			elif len(data) == 1:
				return False
			else:
				return False
		else:
			return True
	
	def get_code(self, key: str) -> str:
		key_parts = key.split(key_delimiter)
		return 'raw_' + key_parts[1].lower()
	
	def validate_key_pattern(self, key: str) -> bool:
		key_parts = key.split(key_delimiter)
		if len(key_parts) == 3 or len(key_parts) == 5:
			return True
		else:
			return False