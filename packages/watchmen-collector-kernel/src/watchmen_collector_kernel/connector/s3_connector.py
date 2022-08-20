import asyncio
import traceback
from logging import getLogger
from threading import Thread
from typing import Optional

from time import sleep
from watchmen_pipeline_surface.connectors.handler import handle_trigger_data

from watchmen_collector_kernel.common import S3CollectorSettings
from watchmen_collector_kernel.lock import get_oss_collector_lock_service, get_unique_key_distributed_lock, \
	DistributedLock
from watchmen_collector_kernel.model import OSSCollectorCompetitiveLock
from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.common import Storable
from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT
from watchmen_storage_s3 import SimpleStorageService, ObjectContent
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)

key_delimiter = "~"


def init_s3_collector(settings: S3CollectorSettings):
	S3Connector(settings).create_connector()


class Dependency(Storable):
	model_name: str
	object_id: str


class S3Connector:

	def __init__(self, settings: S3CollectorSettings):
		self.simpleStorageService = SimpleStorageService(access_key_id=settings.access_key_id,
		                                                 access_key_secret=settings.secret_access_key,
		                                                 endpoint=settings.region,
		                                                 bucket_name=settings.bucket_name,
		                                                 params=None)
		self.lock_service = get_oss_collector_lock_service()
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

	def consume(self, object_: ObjectContent):
		if self.validate_key_pattern(object_.key):
			distributed_lock = get_unique_key_distributed_lock(self.get_resource_lock(object_.key), self.lock_service)
			dependency = self.get_dependency(object_.key)
			if self.ask_lock(distributed_lock):
				try:
					if self.check_dependency_finished(dependency):
						self.process(object_.key, self.get_code(object_.key), self.token)
					else:
						logger.info("Dependency is not finished %s", object_.key)
				except Exception as e:
					traceback.print_exc()

					logger.error("process object %s error", object_.key)
				finally:
					self.ask_unlock(distributed_lock)
		else:
			logger.error("The key pattern is not correct, %s", object_.key)

	def ask_lock(self, lock: DistributedLock) -> bool:
		return lock.try_lock_nowait()

	def ask_unlock(self, lock: DistributedLock) -> bool:
		return lock.unlock()

	def process(self, key: str, code: str, token: str):
		payload = self.simpleStorageService.get_object(key)
		if payload:
			logger.info("event code {}".format(code))
			trigger_data = PipelineTriggerDataWithPAT(code=code,
			                                          pat=token,
			                                          data=payload)
			asyncio.run(handle_trigger_data(trigger_data))
		# self.simpleStorageService.delete_object(key)

	def get_resource_lock(self, key: str) -> OSSCollectorCompetitiveLock:
		key_parts = key.split(key_delimiter)
		return OSSCollectorCompetitiveLock(lockId=self.snowflakeGenerator.next_id(),
		                                   resourceId=key,
		                                   modelName=key_parts[1],
		                                   objectId=key_parts[2])

	def get_dependency(self, key: str) -> Optional[Dependency]:
		key_parts = key.split(key_delimiter)
		if len(key_parts) == 5:
			return Dependency(model_name=key_parts[3], object_id=key_parts[4])
		else:
			return Dependency(model_name=key_parts[1], object_id=key_parts[2])

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
