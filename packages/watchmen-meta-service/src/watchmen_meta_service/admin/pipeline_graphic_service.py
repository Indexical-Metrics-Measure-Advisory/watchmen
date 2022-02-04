from watchmen_auth import PrincipalService
from watchmen_meta_service.common import StorageService
from watchmen_model.admin import PipelineGraphic
from watchmen_storage import EntityHelper, EntityIdHelper, EntityRow, EntityShaper, \
	SnowflakeGenerator, TransactionalStorageSPI


class PipelineGraphicShaper(EntityShaper):
	def serialize(self, pipeline_graphic: PipelineGraphic) -> EntityRow:
		return {
			'pipeline_graphic_id': pipeline_graphic.pipelineGraphId,
			'name': pipeline_graphic.name,
			'topics': pipeline_graphic.topics,
			'tenant_id': pipeline_graphic.tenantId,
			'user_id': pipeline_graphic.userId
		}

	def deserialize(self, row: EntityRow) -> PipelineGraphic:
		return PipelineGraphic(
			pipelineGraphId=row.get('pipeline_graphic_id'),
			name=row.get('name'),
			topics=row.get('topics'),
			tenantId=row.get('tenant_id'),
			userId=row.get('user_id')
		)


PIPELINE_GRAPHIC_ENTITY_NAME = 'pipeline_graphics'
PIPELINE_GRAPHIC_ENTITY_SHAPER = PipelineGraphicShaper()


class PipelineGraphicService(StorageService):
	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService,

	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)
		self.with_principal_service(principal_service)

	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return PIPELINE_GRAPHIC_ENTITY_NAME

	def get_id_column_name(self) -> str:
		return 'pipeline_graphic_id'

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return PIPELINE_GRAPHIC_ENTITY_SHAPER

	def get_entity_helper(self) -> EntityHelper:
		return EntityHelper(name=self.get_entity_name(), shaper=self.get_entity_shaper())

	def get_entity_id_helper(self) -> EntityIdHelper:
		return EntityIdHelper(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			idColumnName=self.get_id_column_name()
		)

	def create(self, pipeline_graphic: PipelineGraphic) -> None:
		return self.storage.insert_one(pipeline_graphic, self.get_entity_helper())

	def update(self, pipeline_graphic: PipelineGraphic) -> None:
		self.storage.update_one(pipeline_graphic, self.get_entity_id_helper())
