from datetime import datetime
from typing import List, Optional, Tuple

from watchmen_meta_service.common import TupleNotFoundException, TupleService, TupleShaper
from watchmen_model.admin import Pipeline, PipelineStage
from watchmen_model.common import PipelineId, TenantId, UserId
from watchmen_storage import EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class PipelineShaper(EntityShaper):
	@staticmethod
	def serialize_stage(stage: PipelineStage) -> dict:
		if isinstance(stage, dict):
			return stage
		else:
			return stage.dict()

	@staticmethod
	def serialize_stages(stages: Optional[List[PipelineStage]]) -> Optional[list]:
		if stages is None:
			return None
		return ArrayHelper(stages).map(lambda x: PipelineShaper.serialize_stage(x)).to_list()

	def serialize(self, pipeline: Pipeline) -> EntityRow:
		return TupleShaper.serialize_tenant_based(pipeline, {
			'pipeline_id': pipeline.pipelineId,
			'topic_id': pipeline.topicId,
			'name': pipeline.name,
			'type': pipeline.type,
			'stages': PipelineShaper.serialize_stages(pipeline.stages),
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

	def get_storable_id(self, storable: Pipeline) -> PipelineId:
		return storable.pipelineId

	def set_storable_id(self, storable: Pipeline, storable_id: PipelineId) -> Pipeline:
		storable.pipelineId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'pipeline_id'

	def update_name(self, pipeline_id: PipelineId, name: str, tenant_id: TenantId) -> Tuple[UserId, datetime]:
		"""
		update name will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principal_service.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=pipeline_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
			],
			update={
				'name': name,
				'last_modified_at': last_modified_at,
				'last_modified_by': last_modified_by
			}
		))
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return last_modified_by, last_modified_at

	def update_enablement(self, pipeline_id: PipelineId, enabled: bool, tenant_id: TenantId) -> Tuple[UserId, datetime]:
		"""
		update enablement will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principal_service.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(name=self.get_storable_id_column_name(), value=pipeline_id),
				EntityCriteriaExpression(name='tenant_id', value=tenant_id)
			],
			update={
				'enabled': enabled,
				'last_modified_at': last_modified_at,
				'last_modified_by': last_modified_by
			}
		))
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		return last_modified_by, last_modified_at

	def find_all(self, tenant_id: Optional[TenantId]) -> List[Pipeline]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
