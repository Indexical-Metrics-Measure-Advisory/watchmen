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

	def remove_index(self, pipeline: Pipeline) -> None:
		# TODO remove pipeline index
		pass
