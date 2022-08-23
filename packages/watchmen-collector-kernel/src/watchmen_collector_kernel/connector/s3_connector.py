import asyncio
from logging import getLogger
from threading import Thread
from time import sleep
from typing import Optional, Dict, Any

from watchmen_collector_kernel.common import S3CollectorSettings
from watchmen_collector_kernel.lock import get_oss_collector_lock_service, get_unique_key_distributed_lock, \
	DistributedLock
from watchmen_collector_kernel.model import OSSCollectorCompetitiveLock
from watchmen_meta.common import ask_snowflake_generator
from watchmen_storage_s3 import SimpleStorageService, ObjectContent

from watchmen_model.pipeline_kernel import PipelineTriggerData
from watchmen_model.common import Storable

from .handler import save_topic_data, handle_trigger_data

logger = getLogger(__name__)

identifier_delimiter = "~"


class TopicDataSaveException(Exception):
	pass


class PipelineExecutionException(Exception):
	pass


class PayloadNullException(Exception):
	pass


class KeyValidatedException(Exception):
	pass


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
		self.tenant_id = settings.tenant_id
		self.consume_prefix = settings.consume_prefix
		self.dead_prefix = settings.dead_prefix
	
	def create_connector(self) -> None:
		Thread(target=S3Connector.run, args=(self,), daemon=True).start()
	
	def run(self):
		while True:
			objects = self.simpleStorageService.list_objects(max_keys=10, prefix=self.consume_prefix)
			print(len(objects))
			if len(objects) == 0:
				sleep(5)
			else:
				for object_ in objects:
					result = self.consume(object_)
					if result == 0:
						break
	
	def consume(self, object_: ObjectContent) -> int:
		distributed_lock = get_unique_key_distributed_lock(self.get_resource_lock(object_.key), self.lock_service)
		if self.ask_lock(distributed_lock):
			try:
				need_move = False
				payload = self.get_payload(object_.key)
				object_key = self.get_identifier(self.consume_prefix, object_.key)
				if self.validate_key_pattern(object_key):
					dependency = self.get_dependency(object_key)
					if self.check_dependency_finished(dependency):
						self.process(object_.key, self.get_code(object_key), payload)
					else:
						logger.error("Dependency is not finished %s", object_.key)
			except KeyValidatedException:
				logger.error("object key validate error, ready to move to dead queue: %s", object_.key)
				need_move = True
			except TopicDataSaveException:
				logger.error("save topic data error, ready to move to dead queue: %s", object_.key)
				need_move = True
			except PayloadNullException:
				logger.error("payload is None, ready to move to dead queue: %s", object_.key)
				need_move = True
			except PipelineExecutionException:
				logger.error("pipeline executing error, ready to move to dead queue: %s", object_.key)
				need_move = True
			except Exception:
				logger.error("process object %s error", object_.key)
				need_move = True
			finally:
				if need_move:
					self.move_to_dead_queue(object_.key, payload)
				else:
					self.simpleStorageService.delete_object(object_.key)
				self.ask_unlock(distributed_lock)
				return 0
	
	def get_payload(self, key: str) -> Dict:
		result = self.simpleStorageService.get_object(key)
		if result:
			return result
		else:
			raise PayloadNullException("payload is None. %s", key)
	
	def ask_lock(self, lock: DistributedLock) -> bool:
		return lock.try_lock_nowait()
	
	def ask_unlock(self, lock: DistributedLock) -> bool:
		return lock.unlock()
	
	def process(self, key: str, code: str, payload: Dict[str, Any] = None):
		logger.info("start to process %s and %s", code, key)
		trigger_data = PipelineTriggerData(code=code, data=payload, tenantId=self.tenant_id)
		try:
			result = save_topic_data(trigger_data)
		except Exception:
			raise TopicDataSaveException("Save trigger data error", key)
		else:
			try:
				asyncio.run(handle_trigger_data(trigger_data, result))
			except Exception:
				raise PipelineExecutionException("Process trigger data error", key)
	
	def get_resource_lock(self, key: str) -> OSSCollectorCompetitiveLock:
		object_key = self.get_identifier(self.consume_prefix, key)
		key_parts = object_key.split(identifier_delimiter)
		return OSSCollectorCompetitiveLock(lockId=self.snowflakeGenerator.next_id(),
		                                   resourceId=key,
		                                   modelName=key_parts[1],
		                                   objectId=key_parts[2])
	
	def get_dependency(self, key: str) -> Optional[Dependency]:
		key_parts = key.split(identifier_delimiter)
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
	
	def get_code(self, identifier: str) -> str:
		key_parts = identifier.split(identifier_delimiter)
		return 'raw_' + key_parts[1].lower()
	
	def validate_key_pattern(self, identifier: str) -> bool:
		key_parts = identifier.split(identifier_delimiter)
		if len(key_parts) == 3:
			return True
		elif len(key_parts) == 5:
			return True
		else:
			raise KeyValidatedException("Validate key pattern error %s", identifier)
	
	def move_to_dead_queue(self, key: str, payload: Optional[Dict] = None):
		if payload is None:
			payload = self.simpleStorageService.get_object(key)
		dead_queue_key = self.generate_dead_file_key(key)
		self.simpleStorageService.put_object(dead_queue_key, payload)
		self.simpleStorageService.delete_object(key)
	
	def generate_dead_file_key(self, key_: str):
		return self.dead_prefix + self.get_identifier(self.consume_prefix, key_)
	
	@staticmethod
	def get_identifier(prefix, key) -> str:
		return key.removeprefix(prefix)
	
