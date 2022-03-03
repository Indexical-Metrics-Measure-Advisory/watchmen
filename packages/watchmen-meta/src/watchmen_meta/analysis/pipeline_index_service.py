from watchmen_meta.common import ask_engine_index_enabled, StorageService
from watchmen_model.admin import Pipeline
from watchmen_model.analysis import PipelineIndex
from watchmen_model.common import PipelineId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityDeleter, EntityRow, EntityShaper, \
	SnowflakeGenerator, TransactionalStorageSPI


class PipelineIndexShaper(EntityShaper):
	def serialize(self, pipeline_index: PipelineIndex) -> EntityRow:
		return {
			'pipeline_index_id': pipeline_index.pipelineIndexId,
			'pipeline_id': pipeline_index.pipelineId,
			'pipeline_name': pipeline_index.pipelineName,
			'stage_id': pipeline_index.stageId,
			'stage_name': pipeline_index.stageName,
			'unit_id': pipeline_index.unitId,
			'unit_name': pipeline_index.unitName,
			'action_id': pipeline_index.actionId,
			'mapping_to_topic_id': pipeline_index.mappingToTopicId,
			'mapping_to_factor_id': pipeline_index.mappingToFactorId,
			'source_from_topic_id': pipeline_index.sourceFromTopicId,
			'source_from_factor_id': pipeline_index.sourceFromFactorId,
			'ref_type': pipeline_index.refType,
			'tenant_id': pipeline_index.tenantId,
			'created_at': pipeline_index.createdAt,
			'last_modified_at': pipeline_index.lastModifiedAt
		}

	def deserialize(self, row: EntityRow) -> PipelineIndex:
		return PipelineIndex(
			pipelineIndexId=row.get('pipeline_index_id'),
			pipelineId=row.get('pipeline_id'),
			pipelineName=row.get('pipeline_name'),
			stageId=row.get('stage_id'),
			stageName=row.get('stage_name'),
			unitId=row.get('unit_id'),
			unitName=row.get('unit_name'),
			actionId=row.get('action_id'),
			mappingToTopicId=row.get('mapping_to_topic_id'),
			mappingToFactorId=row.get('mapping_to_factor_id'),
			sourceFromTopicId=row.get('source_from_topic_id'),
			sourceFromFactorId=row.get('source_from_factor_id'),
			refType=row.get('ref_type'),
			tenantId=row.get('tenant_id'),
			createdAt=row.get('created_at'),
			lastModifiedAt=row.get('last_modified_at')
		)


PIPELINE_INDEX_ENTITY_NAME = 'pipeline_index'
PIPELINE_INDEX_ENTITY_SHAPER = PipelineIndexShaper()


class PipelineIndexService(StorageService):
	def __init__(
			self, storage: TransactionalStorageSPI, snowflake_generator: SnowflakeGenerator
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)

	# noinspection PyMethodMayBeStatic,PyUnusedLocal
	def build_index(self, pipeline: Pipeline) -> None:
		if not ask_engine_index_enabled():
			return
		# TODO build pipeline index
		return

	def update_index_on_name_changed(self, pipeline: Pipeline) -> None:
		pass

	def update_index_on_enablement_changed(self, pipeline: Pipeline) -> None:
		pass

	def remove_index(self, pipeline_id: PipelineId) -> None:
		if not ask_engine_index_enabled():
			return

		self.storage.delete(EntityDeleter(
			name=PIPELINE_INDEX_ENTITY_NAME,
			shaper=PIPELINE_INDEX_ENTITY_SHAPER,
			criteria=[EntityCriteriaExpression(left=ColumnNameLiteral(columnName='pipeline_id'), right=pipeline_id)]
		))
