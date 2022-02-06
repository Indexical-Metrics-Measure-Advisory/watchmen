from watchmen_meta_service.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.admin import PipelineGraphic
from watchmen_model.common import PipelineGraphicId
from watchmen_storage import EntityRow, \
	EntityShaper


class PipelineGraphicShaper(EntityShaper):
	def serialize(self, pipeline_graphic: PipelineGraphic) -> EntityRow:
		row = {
			'pipeline_graphic_id': pipeline_graphic.pipelineGraphId,
			'name': pipeline_graphic.name,
			'topics': pipeline_graphic.topics
		}
		row = UserBasedTupleShaper.serialize(pipeline_graphic, row)
		return row

	def deserialize(self, row: EntityRow) -> PipelineGraphic:
		pipeline_graphic = PipelineGraphic(
			pipelineGraphId=row.get('pipeline_graphic_id'),
			name=row.get('name'),
			topics=row.get('topics')
		)
		# noinspection PyTypeChecker
		pipeline_graphic: PipelineGraphic = UserBasedTupleShaper.deserialize(row, pipeline_graphic)
		return pipeline_graphic


PIPELINE_GRAPHIC_ENTITY_NAME = 'pipeline_graphics'
PIPELINE_GRAPHIC_ENTITY_SHAPER = PipelineGraphicShaper()


class PipelineGraphicService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return PIPELINE_GRAPHIC_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return PIPELINE_GRAPHIC_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'pipeline_graphic_id'

	def get_storable_id(self, storable: PipelineGraphic) -> PipelineGraphicId:
		return storable.pipelineGraphId

	def set_storable_id(self, storable: PipelineGraphic, storable_id: PipelineGraphicId) -> PipelineGraphic:
		storable.pipelineGraphId = storable_id
		return storable
