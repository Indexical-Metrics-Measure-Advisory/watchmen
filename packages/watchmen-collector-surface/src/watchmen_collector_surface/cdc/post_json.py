from logging import getLogger
from threading import Thread
from time import sleep
from traceback import format_exc

from watchmen_collector_kernel.common import TENANT_ID, CHANGE_JSON_ID, WAVE
from watchmen_collector_kernel.model import ChangeDataJson, ScheduledTask, TaskStatus
from watchmen_collector_kernel.service.lock_helper import get_resource_lock, try_lock_nowait, unlock
from watchmen_collector_kernel.storage import get_change_data_json_service, get_competitive_lock_service, \
	get_scheduled_task_service, get_collector_model_config_service, get_trigger_model_service
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


def init_json_listener():
	PostJsonService().create_thread()


class PostJsonService:

	def __init__(self):
		self.storage = ask_meta_storage()
		self.snowflake_generator = ask_snowflake_generator()
		self.principle_service = ask_super_admin()
		self.competitive_lock_service = get_competitive_lock_service(self.storage)
		self.change_json_service = get_change_data_json_service(self.storage,
		                                                        self.snowflake_generator,
		                                                        self.principle_service)
		self.scheduled_task_service = get_scheduled_task_service(self.storage,
		                                                         self.snowflake_generator,
		                                                         self.principle_service)
		self.model_config_service = get_collector_model_config_service(self.storage,
		                                                               self.snowflake_generator,
		                                                               self.principle_service)
		self.trigger_model_service = get_trigger_model_service(self.storage,
		                                                       self.snowflake_generator,
		                                                       self.principle_service)

	def create_thread(self) -> None:
		Thread(target=PostJsonService.run, args=(self,), daemon=True).start()

	def run(self):
		try:
			while True:
				self.change_data_json_listener()
		except Exception as e:
			logger.error(e, exc_info=True, stack_info=True)
			sleep(5)
			self.create_thread()

	def change_data_json_listener(self):
		not_posted_json = self.change_json_service.find_not_posted_json()
		if len(not_posted_json) == 0:
			sleep(5)
		else:
			for json_record in not_posted_json:
				lock = get_resource_lock(str(self.snowflake_generator.next_id()),
				                         json_record.get(CHANGE_JSON_ID),
				                         json_record.get(TENANT_ID))
				try:
					if try_lock_nowait(self.competitive_lock_service, lock):
						change_data_json = self.change_json_service.find_json_by_id(
							json_record.get(CHANGE_JSON_ID))
						if self.is_posted(change_data_json):
							continue
						else:
							try:
								if self.can_post(change_data_json):
									self.post_json(change_data_json)
								else:
									continue
							except Exception as e:
								logger.error(e, exc_info=True, stack_info=True)
								change_data_json.isPosted = True
								change_data_json.result = format_exc()
								self.change_json_service.update_change_data_json(change_data_json)
				finally:
					unlock(self.competitive_lock_service, lock)

	# noinspection PyMethodMayBeStatic
	def is_posted(self, change_json: ChangeDataJson) -> bool:
		return change_json.isPosted

	def is_paralleled(self, change_json: ChangeDataJson) -> bool:
		model_config = self.model_config_service.find_by_name(change_json.modelName)
		return model_config.is_paralleled

	def is_model_trigger_finished(self, change_json: ChangeDataJson) -> bool:
		trigger_model = self.trigger_model_service.find_trigger_by_id(change_json.modelTriggerId)
		return trigger_model.isFinished

	def can_post(self, change_json: ChangeDataJson) -> bool:
		if self.is_paralleled(change_json):
			return True
		elif self.is_model_trigger_finished(change_json):
			if self.is_sequenced(change_json):
				return True
			else:
				return False
		else:
			return False

	def is_sequenced(self, change_json: ChangeDataJson) -> bool:
		json = self.change_json_service.find_by_object_id(change_json.modelName,
		                                                  change_json.objectId,
		                                                  change_json.eventTriggerId)

		def is_finished(sequenced_json: ChangeDataJson) -> bool:
			if compare_sequence(sequenced_json.sequence, change_json.sequence):
				if sequenced_json.isPosted:
					return True
				else:
					return False
			else:
				return True

		def compare_sequence(sequence_0, sequence_1) -> bool:
			if sequence_0 and sequence_1:
				return sequence_0 < sequence_1
			else:
				return False

		return ArrayHelper(json).every(is_finished)

	def post_json(self, change_json: ChangeDataJson) -> ScheduledTask:
		task = self.get_scheduled_task(change_json)
		self.scheduled_task_service.begin_transaction()
		try:
			change_json.isPosted = True
			self.change_json_service.update(change_json)
			self.scheduled_task_service.create(task)
			self.scheduled_task_service.commit_transaction()
			return task
		except Exception as e:
			self.scheduled_task_service.rollback_transaction()
			raise e

	def get_scheduled_task(self, change_json: ChangeDataJson) -> ScheduledTask:
		return ScheduledTask(
			taskId=self.snowflake_generator.next_id(),
			resourceId=self.generate_resource_id(change_json),
			content=change_json.content,
			modelName=change_json.modelName,
			objectId=change_json.objectId,
			dependencies=change_json.dependOn,
			status=TaskStatus.INITIAL.value,
			result=None,
			tenantId=change_json.tenantId
		)

	# noinspection PyMethodMayBeStatic
	def generate_resource_id(self, change_json: ChangeDataJson) -> str:
		return f'{change_json.changeJsonId}{WAVE}{change_json.eventTriggerId}'
