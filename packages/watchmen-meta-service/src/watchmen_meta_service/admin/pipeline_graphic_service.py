from watchmen_meta_service.common import UserBasedTupleService
from watchmen_model.admin import PipelineGraphic
from watchmen_model.common import PipelineGraphicId
from watchmen_storage import EntityRow, \
	EntityShaper


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


class PipelineGraphicService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return PIPELINE_GRAPHIC_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return PIPELINE_GRAPHIC_ENTITY_SHAPER

	def get_tuple_id_column_name(self) -> str:
		return 'pipeline_graphic_id'

	def get_tuple_id(self, a_tuple: PipelineGraphic) -> PipelineGraphicId:
		return a_tuple.pipelineGraphId

	def set_tuple_id(self, a_tuple: PipelineGraphic, tuple_id: PipelineGraphicId) -> PipelineGraphic:
		a_tuple.pipelineGraphId = tuple_id
		return a_tuple
