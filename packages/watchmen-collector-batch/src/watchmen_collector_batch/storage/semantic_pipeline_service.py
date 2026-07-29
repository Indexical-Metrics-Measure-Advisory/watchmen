from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_collector_batch.model.semantic_pipeline import SemanticPipeline, SemanticAction
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import Pipeline
from watchmen_model.common import PipelineId
from watchmen_storage import EntityRow, \
	EntityShaper, TransactionalStorageSPI, SnowflakeGenerator, EntityCriteriaExpression, ColumnNameLiteral, \
	EntityDeleter
from watchmen_utilities import ArrayHelper


class CollectorSemanticPipelinesShaper(EntityShaper):

	def serialize(self, semantic_pipeline: SemanticPipeline) -> EntityRow:
		return TupleShaper.serialize_tenant_based(semantic_pipeline, {
			'pipeline_id': semantic_pipeline.pipelineId,
			'topic_id': semantic_pipeline.topicId,
			'name': semantic_pipeline.name,
			'actions': ArrayHelper(semantic_pipeline.actions).map(lambda x: x.to_dict()).to_list(),
			'sources': ArrayHelper(semantic_pipeline.sources).map(lambda x: x.to_dict()).to_list()
		})

	def deserialize(self, row: EntityRow) -> Pipeline:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, SemanticPipeline(
			pipelineId=row.get('pipeline_id'),
			topicId=row.get('topic_id'),
			name=row.get('name'),
			actions=row.get('actions'),
			sources=row.get('sources')
		))


COLLECTOR_SEMANTIC_PIPELINE_ENTITY_NAME = 'collector_semantic_pipelines'
COLLECTOR_SEMANTIC_PIPELINE_ENTITY_SHAPER = CollectorSemanticPipelinesShaper()


class CollectorSemanticPipelineService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return COLLECTOR_SEMANTIC_PIPELINE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return COLLECTOR_SEMANTIC_PIPELINE_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id(self, storable: SemanticPipeline) -> PipelineId:
		return storable.pipelineId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: SemanticPipeline, storable_id: PipelineId) -> Pipeline:
		storable.pipelineId = storable_id
		return storable

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> str:
		return 'pipeline_id'

# noinspection PyTypeChecker
	def create_semantic_pipeline(self, semantic_pipeline: SemanticPipeline) -> SemanticPipeline:
		self.begin_transaction()
		try:
			semantic_pipeline = self.create(semantic_pipeline)
			self.commit_transaction()
			return semantic_pipeline
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	# noinspection PyTypeChecker
	def update_semantic_pipeline(self, semantic_pipeline: SemanticPipeline) -> SemanticPipeline:
		self.begin_transaction()
		try:
			semantic_pipeline = self.update(semantic_pipeline)
			self.commit_transaction()
			return semantic_pipeline
		except Exception as e:
			self.rollback_transaction()
			raise e
		finally:
			self.close_transaction()

	def find_semantic_pipeline_by_id(self, pipeline_id: str) -> Optional[SemanticPipeline]:
		self.begin_transaction()
		try:
			return self.find_by_id(pipeline_id)
		finally:
			self.close_transaction()
			
	
	def find_semantic_pipelines_by_tenant_id(self, tenant_id: str) -> List[SemanticPipeline]:
		try:
			self.storage.connect()
			# noinspection PyTypeChecker
			return self.storage.find(
				self.get_entity_finder(
					criteria=[
						EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'),
						                         right=tenant_id),
					]
				)
			)
		finally:
			self.storage.close()
			
	def delete_by_tenant_id(self, tenant_id: int) -> None:
		self.storage.begin()
		try:
			self.storage.delete(
				EntityDeleter(
					name=COLLECTOR_SEMANTIC_PIPELINE_ENTITY_NAME,
					shaper=COLLECTOR_SEMANTIC_PIPELINE_ENTITY_SHAPER,
					criteria=[
						EntityCriteriaExpression(
							left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
					]
				)
			)
			self.storage.commit_and_close()
		except Exception as e:
			self.storage.rollback_and_close()
			raise e
		finally:
			self.storage.close()
			

def get_collector_semantic_pipeline_service(storage: TransactionalStorageSPI,
                                  snowflake_generator: SnowflakeGenerator,
                                  principal_service: PrincipalService
) -> CollectorSemanticPipelineService:
	return CollectorSemanticPipelineService(storage, snowflake_generator, principal_service)