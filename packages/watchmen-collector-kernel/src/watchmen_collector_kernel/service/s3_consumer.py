import asyncio
from logging import getLogger
from threading import Thread
from typing import List

from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT
from watchmen_pipeline_surface.connectors.handler import handle_trigger_data
from watchmen_storage import SnowflakeGenerator
from watchmen_storage_s3 import SimpleStorageService
from .consumer import Consumer
from watchmen_collector_kernel.lock import DistributedLock
from watchmen_collector_kernel.model import ResourceLock
from ..lock.lock_service import LockService

logger = getLogger(__name__)


class S3Consumer(Consumer):
	
	def __init__(self, simple_storage_service: SimpleStorageService):
		self.simpleStorageService = simple_storage_service
	
	def ask_lock(self, lock: DistributedLock) -> bool:
		return lock.try_lock_nowait()
	
	def ask_unlock(self, lock: DistributedLock) -> bool:
		return lock.unlock()
	
	def process(self, key: str, code: str, token: str):
		payload = self.simpleStorageService.get_object(key)
		if payload:
			trigger_data = PipelineTriggerDataWithPAT(code=code,
			                                          pat=token,
			                                          data=payload)
			asyncio.run(handle_trigger_data(trigger_data))
			self.simpleStorageService.delete_object(key)
