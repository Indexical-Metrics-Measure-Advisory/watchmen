from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.admin import Pipeline
from watchmen_model.common import PipelineId
from watchmen_storage import EntityRow, \
	EntityShaper


class PipelineShaper(EntityShaper):
	def serialize(self, pipeline: Pipeline) -> EntityRow:
		return TupleShaper.serialize_tenant_based(pipeline, {
			'pipeline_id': pipeline.pipelineId,
			'topic_id': pipeline.topicId,
			'name': pipeline.name,
			'type': pipeline.type,
			'stages': pipeline.stages,
			'enabled': pipeline.enabled,
			'validated': pipeline.validated
		})

	def deserialize(self, row: EntityRow) -> Pipeline:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Pipeline(
			pipelineId=row.get('pipeline_id'),
			topicId=row.get('topic_id'),
			name=row.get('name'),
			type=row.get('type'),
			stages=row.get('stages'),
			enabled=row.get('enabled'),
			validated=row.get('validated')
		))


PIPELINE_ENTITY_NAME = 'pipelines'
PIPELINE_ENTITY_SHAPER = PipelineShaper()


class PipelineService(TupleService):
	def get_entity_name(self) -> str:
		return PIPELINE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return PIPELINE_ENTITY_SHAPER

	def get_tuple_id(self, a_tuple: Pipeline) -> PipelineId:
		return a_tuple.pipelineId

	def set_tuple_id(self, a_tuple: Pipeline, tuple_id: PipelineId) -> Pipeline:
		a_tuple.pipelineId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'pipeline_id'
