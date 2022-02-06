from typing import List, Optional

from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.admin import Space
from watchmen_model.admin.space import SpaceFilter
from watchmen_model.common import DataPage, Pageable, SpaceId, TenantId
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class SpaceShaper(EntityShaper):
	@staticmethod
	def serialize_filter(space_filter: SpaceFilter) -> dict:
		if isinstance(space_filter, dict):
			return space_filter
		else:
			return space_filter.dict()

	@staticmethod
	def serialize_filters(filters: Optional[List[SpaceFilter]]) -> Optional[list]:
		if filters is None:
			return None
		return ArrayHelper(filters).map(lambda x: SpaceShaper.serialize_filter(x)).to_list()

	def serialize(self, space: Space) -> EntityRow:
		return TupleShaper.serialize_tenant_based(space, {
			'space_id': space.spaceId,
			'name': space.name,
			'description': space.description,
			'topic_ids': space.topicIds,
			'group_ids': space.groupIds,
			'filters': SpaceShaper.serialize_filters(space.filters),
		})

	def deserialize(self, row: EntityRow) -> Space:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Space(
			spaceId=row.get('space_id'),
			name=row.get('name'),
			description=row.get('description'),
			topicIds=row.get('topic_ids'),
			groupIds=row.get('group_ids'),
			filters=row.get('filters')
		))


SPACE_ENTITY_NAME = 'spaces'
SPACE_ENTITY_SHAPER = SpaceShaper()


class SpaceService(TupleService):
	def get_entity_name(self) -> str:
		return SPACE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return SPACE_ENTITY_SHAPER

	def get_storable_id(self, storable: Space) -> SpaceId:
		return storable.spaceId

	def set_storable_id(self, storable: Space, storable_id: SpaceId) -> Space:
		storable.spaceId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'space_id'

	def find_by_text(self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='name', operator=EntityCriteriaOperator.LIKE, value=text))
			criteria.append(
				EntityCriteriaExpression(name='description', operator=EntityCriteriaOperator.LIKE, value=text))
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria, pageable))

	def find_by_ids(self, space_ids: List[SpaceId], tenant_id: Optional[TenantId]) -> List[Space]:
		criteria = [
			EntityCriteriaExpression(name='space_id', operator=EntityCriteriaOperator.IN, value=space_ids)
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='tenant_id', value=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria))
