from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.admin import Space
from watchmen_model.common import SpaceId
from watchmen_storage import EntityRow, EntityShaper


class SpaceShaper(EntityShaper):
	def serialize(self, space: Space) -> EntityRow:
		return TupleShaper.serialize_tenant_based(space, {
			'space_id': space.spaceId,
			'name': space.name,
			'description': space.description,
			'topic_ids': space.topicIds,
			'user_group_ids': space.groupIds,
			'filters': space.filters,
		})

	def deserialize(self, row: EntityRow) -> Space:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Space(
			spaceId=row.get('space_id'),
			name=row.get('name'),
			description=row.get('description'),
			topicIds=row.get('topic_ids'),
			groupIds=row.get('user_group_ids'),
			filters=row.get('filters')
		))


SPACE_ENTITY_NAME = 'spaces'
SPACE_ENTITY_SHAPER = SpaceShaper()


class SpaceService(TupleService):
	def get_entity_name(self) -> str:
		return SPACE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return SPACE_ENTITY_SHAPER

	def get_tuple_id(self, a_tuple: Space) -> SpaceId:
		return a_tuple.spaceId

	def set_tuple_id(self, a_tuple: Space, tuple_id: SpaceId) -> Space:
		a_tuple.spaceId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'space_id'
