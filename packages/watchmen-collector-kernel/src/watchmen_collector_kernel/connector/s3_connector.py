import asyncio
from enum import Enum
from logging import getLogger
from threading import Thread
from time import sleep
from typing import Optional, Dict, Any

from watchmen_collector_kernel.common import S3CollectorSettings
from watchmen_collector_kernel.lock import get_oss_collector_lock_service, get_unique_key_distributed_lock, \
	DistributedLock
from watchmen_collector_kernel.model import OSSCollectorCompetitiveLock
from watchmen_data_kernel.storage import TopicTrigger
from watchmen_meta.common import ask_snowflake_generator

from watchmen_storage_s3 import SimpleStorageService, ObjectContent

from watchmen_model.pipeline_kernel import PipelineTriggerData
from watchmen_model.common import Storable

from .handler import save_topic_data, handle_trigger_data
from .housekeeping import init_task_housekeeping

logger = getLogger(__name__)

identifier_delimiter = "~"


class STATUS(str, Enum):
	CHECK_KEY_FAILED = "CHECK_KEY_FAILED"
	DEPENDENCY_FAILED = "DEPENDENCY_FAILED"
	CREATE_TASK_FAILED = "CREATE_TASK_FAILED"
	EMPTY_PAYLOAD = "EMPTY_PAYLOAD"
	COMPLETED_TASK = "COMPLETED_TASK"
	PROCESS_TASK_FAILED = "PROCESS_TASK_FAILED"


def init_s3_collector(settings: S3CollectorSettings):
	S3Connector(settings).create_connector()
	init_task_housekeeping(settings)


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
		self.maxKeys = settings.max_keys
	
	def create_connector(self) -> None:
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
						result = self.consume(object_)
						if result == STATUS.CREATE_TASK_FAILED or result == STATUS.DEPENDENCY_FAILED:
							# logger.info("CREATE_TASK_FAILED or DEPENDENCY_FAILED , key is  {}".format(object_.key))
							continue
						elif result == STATUS.CHECK_KEY_FAILED or result == STATUS.COMPLETED_TASK or \
								STATUS.EMPTY_PAYLOAD or result == STATUS.PROCESS_TASK_FAILED:
							logger.info(
								"CHECK_KEY_FAILED or COMPLETED_TASK or EMPTY_PAYLOAD or PROCESS_TASK_FAILED, key is  {}".format(
									object_.key))
							break
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(300)
			self.create_connector()
	
	def consume(self, object_: ObjectContent) -> str:
		object_key = self.get_identifier(self.consume_prefix, object_.key)
		if self.validate_key_pattern(object_key):
			dependency = self.get_dependency(object_key)
			if self.check_dependency_finished(dependency):
				distributed_lock = get_unique_key_distributed_lock(self.get_resource_lock(object_.key),
				                                                   self.lock_service)
				try:
					if not self.ask_lock(distributed_lock):
						return STATUS.CREATE_TASK_FAILED
					else:
						payload = self.get_payload(object_.key)
						if payload:
							try:
								trigger_data = PipelineTriggerData(code=self.get_code(object_key), data=payload,
								                                   tenantId=self.tenant_id)
								topic_trigger = self.save_data(trigger_data)
								self.trigger_pipeline(trigger_data, topic_trigger)
								self.simpleStorageService.delete_object(object_.key)
								return STATUS.COMPLETED_TASK
							except Exception as e:
								logger.error(e, exc_info=True, stack_info=True)
								self.move_to_dead_queue(object_.key, payload)
								return STATUS.PROCESS_TASK_FAILED
						else:
							self.move_to_dead_queue(object_.key, payload)
							return STATUS.EMPTY_PAYLOAD
				finally:
					self.ask_unlock(distributed_lock)
			else:
				return STATUS.DEPENDENCY_FAILED
		else:
			distributed_lock = get_unique_key_distributed_lock(self.get_resource_lock(object_.key),
			                                                   self.lock_service)
			try:
				if not self.ask_lock(distributed_lock):
					return STATUS.CREATE_TASK_FAILED
				else:
					payload = self.simpleStorageService.get_object(object_.key)
					self.move_to_dead_queue(object_.key, payload)
					return STATUS.CHECK_KEY_FAILED
			finally:
				self.ask_unlock(distributed_lock)
	
	def get_payload(self, key: str) -> Dict:
		return self.simpleStorageService.get_object(key)
	
	def ask_lock(self, lock: DistributedLock) -> bool:
		return lock.try_lock_nowait()
	
	def ask_unlock(self, lock: DistributedLock) -> bool:
		return lock.unlock()
	
	def process(self, key: str, code: str, payload: Dict[str, Any] = None):
		logger.info("start to process %s and %s", code, key)
		trigger_data = PipelineTriggerData(code=code, data=payload, tenantId=self.tenant_id)
		result = save_topic_data(trigger_data)
		asyncio.run(handle_trigger_data(trigger_data, result))
	
	def save_data(self, trigger_data: PipelineTriggerData) -> TopicTrigger:
		return save_topic_data(trigger_data)
	
	def trigger_pipeline(self, trigger_data: PipelineTriggerData, topic_trigger: TopicTrigger):
		try:
			asyncio.run(handle_trigger_data(trigger_data, topic_trigger))
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
	
	def get_resource_lock(self, key: str) -> OSSCollectorCompetitiveLock:
		object_key = self.get_identifier(self.consume_prefix, key)
		key_parts = object_key.split(identifier_delimiter)
		return OSSCollectorCompetitiveLock(lockId=self.snowflakeGenerator.next_id(),
		                                   resourceId=key,
		                                   modelName=key_parts[1],
		                                   objectId=key_parts[2],
		                                   tenantId=self.tenant_id,
		                                   status=0)
	
	def get_dependency(self, key: str) -> Optional[Dependency]:
		key_parts = key.split(identifier_delimiter)
		if len(key_parts) == 5:
			return Dependency(model_name=key_parts[3], object_id=key_parts[4])
		elif len(key_parts) == 3:
			return Dependency(model_name=key_parts[1], object_id=key_parts[2])
		else:
			return None
	
	def check_dependency_finished(self, dependency: Optional[Dependency]) -> bool:
		if dependency:
			result = self.lock_service.find_by_dependency(dependency.model_name, dependency.object_id)
			if result == 0:
				return True
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
			return False
	
	def move_to_dead_queue(self, key: str, payload: Optional[Dict]):
		dead_queue_key = self.generate_dead_file_key(key)
		self.simpleStorageService.put_object(dead_queue_key, payload)
		self.simpleStorageService.delete_object(key)
	
	def generate_dead_file_key(self, key_: str):
		return self.dead_prefix + self.get_identifier(self.consume_prefix, key_)
	
	@staticmethod
	def get_identifier(prefix, key) -> str:
		return key.removeprefix(prefix)
