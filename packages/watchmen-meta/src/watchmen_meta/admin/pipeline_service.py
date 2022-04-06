from datetime import datetime
from typing import List, Optional

from watchmen_meta.common import TupleNotFoundException, TupleService, TupleShaper
from watchmen_model.admin import Pipeline, PipelineStage
from watchmen_model.common import ParameterJoint, PipelineId, TenantId, TopicId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper, TooManyEntitiesFoundException
from watchmen_utilities import ArrayHelper, is_not_blank


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

	@staticmethod
	def serialize_prerequisite_on(on: Optional[ParameterJoint]) -> Optional[dict]:
		if on is None:
			return None
		return on.to_dict()

	def serialize(self, pipeline: Pipeline) -> EntityRow:
		return TupleShaper.serialize_tenant_based(pipeline, {
			'pipeline_id': pipeline.pipelineId,
			'topic_id': pipeline.topicId,
			'name': pipeline.name,
			'type': pipeline.type,
			'prerequisite_enabled': pipeline.conditional,
			'prerequisite_on': PipelineShaper.serialize_prerequisite_on(pipeline.on),
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
			conditional=row.get('prerequisite_enabled'),
			on=row.get('prerequisite_on'),
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

	# noinspection DuplicatedCode
	def find_tenant_id(self, pipeline_id: PipelineId) -> Optional[TenantId]:
		finder = self.get_entity_finder_for_columns(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=pipeline_id),
			],
			distinctColumnNames=['tenant_id']
		)
		# noinspection PyTypeChecker
		rows: List[Pipeline] = self.storage.find_distinct_values(finder)
		count = len(rows)
		if count == 0:
			return None
		elif count == 1:
			return rows[0].tenantId
		else:
			raise TooManyEntitiesFoundException(f'Too many entities found by finder[{finder}].')

	def find_by_topic_id(self, topic_id: TopicId, tenant_id: TenantId) -> List[Pipeline]:
		finder = self.get_entity_finder_for_columns(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='topic_id'), right=topic_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			],
			distinctColumnNames=['tenant_id']
		)
		# noinspection PyTypeChecker
		return self.storage.find(finder)

	def update_name(self, pipeline_id: PipelineId, name: str, tenant_id: TenantId) -> Pipeline:
		"""
		update name will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principalService.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=pipeline_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			],
			update={
				'name': name,
				'last_modified_at': last_modified_at,
				'last_modified_by': last_modified_by
			}
		))
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		# noinspection PyTypeChecker
		return self.find_by_id(pipeline_id)

	def update_enablement(self, pipeline_id: PipelineId, enabled: bool, tenant_id: TenantId) -> Pipeline:
		"""
		update enablement will not increase optimistic lock version
		"""
		last_modified_at = self.now()
		last_modified_by = self.principalService.get_user_id()
		updated_count = self.storage.update_only(self.get_entity_updater(
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName=self.get_storable_id_column_name()), right=pipeline_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			],
			update={
				'enabled': enabled,
				'last_modified_at': last_modified_at,
				'last_modified_by': last_modified_by
			}
		))
		if updated_count == 0:
			raise TupleNotFoundException('Update 0 row might be caused by tuple not found.')
		# noinspection PyTypeChecker
		return self.find_by_id(pipeline_id)

	def find_all(self, tenant_id: Optional[TenantId]) -> List[Pipeline]:
		criteria = []
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	# noinspection DuplicatedCode
	def find_modified_after(self, last_modified_at: datetime, tenant_id: Optional[TenantId]) -> List[Pipeline]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='last_modified_at'),
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=last_modified_at
			)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
