from watchmen_meta_service.common import StorageService
from watchmen_model.admin import Pipeline
from watchmen_storage import SnowflakeGenerator, TransactionalStorageSPI


class PipelineIndexService(StorageService):
	def __init__(
			self, storage: TransactionalStorageSPI, snowflake_generator: SnowflakeGenerator
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)

	def build_index(self, pipeline: Pipeline) -> None:
		# TODO build pipeline index
		pass

	def update_index_on_name_changed(self, pipeline: Pipeline) -> None:
		# TODO update pipeline index on name changed
		pass

	def update_index_on_enablement_changed(self, pipeline: Pipeline) -> None:
		# TODO update pipeline index on enablement changed
		pass

	def remove_index(self, pipeline: Pipeline) -> None:
		# TODO remove pipeline index
		pass
