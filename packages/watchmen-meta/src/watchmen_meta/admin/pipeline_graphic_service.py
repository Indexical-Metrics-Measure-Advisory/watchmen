from datetime import datetime
from typing import List, Optional, Union

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.admin import PipelineGraphic, TopicGraphic
from watchmen_model.common import PipelineGraphicId, TenantId, UserId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, \
	EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper, is_not_blank


class PipelineGraphicShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_to_dict(
			self,
			data: Optional[Union[dict, TopicGraphic]]
	) -> Optional[dict]:
		if data is None:
			return None
		elif isinstance(data, dict):
			return data
		else:
			return data.dict()

	def serialize(self, pipeline_graphic: PipelineGraphic) -> EntityRow:
		row = {
			'pipeline_graphic_id': pipeline_graphic.pipelineGraphId,
			'name': pipeline_graphic.name,
			'topics': ArrayHelper(pipeline_graphic.topics).map(lambda x: self.serialize_to_dict(x)).to_list(),
			'created_at': pipeline_graphic.createdAt,
			'last_modified_at': pipeline_graphic.lastModifiedAt
		}
		row = UserBasedTupleShaper.serialize(pipeline_graphic, row)
		return row

	def deserialize(self, row: EntityRow) -> PipelineGraphic:
		pipeline_graphic = PipelineGraphic(
			pipelineGraphId=row.get('pipeline_graphic_id'),
			name=row.get('name'),
			topics=row.get('topics'),
			createdAt=row.get('created_at'),
			lastModifiedAt=row.get('last_modified_at')
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

	# noinspection DuplicatedCode
	def find_modified_after(
			self, last_modified_at: datetime, user_id: Optional[UserId], tenant_id: Optional[TenantId]
	) -> List[PipelineGraphic]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='last_modified_at'),
				operator=EntityCriteriaOperator.GREATER_THAN_OR_EQUALS,
				right=last_modified_at
			)
		]
		if is_not_blank(user_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id))
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))

	def find_by_ids(
			self, graphic_ids: List[PipelineGraphicId], user_id: Optional[UserId], tenant_id: Optional[TenantId]
	) -> List[PipelineGraphic]:
		criteria = [
			EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='pipeline_graphic_id'),
				operator=EntityCriteriaOperator.IN,
				right=graphic_ids
			)
		]
		if is_not_blank(user_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='user_id'), right=user_id))
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find_distinct_values(self.get_entity_finder_for_columns(
			distinctColumnNames=['pipeline_graphic_id'],
			criteria=criteria
		))
