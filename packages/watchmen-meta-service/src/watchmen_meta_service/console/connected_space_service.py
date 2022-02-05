from watchmen_meta_service.common import AuditableShaper, LastVisitShaper, UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import ConnectedSpaceId
from watchmen_model.console import ConnectedSpace
from watchmen_storage import EntityRow, EntityShaper


class ConnectedSpaceShaper(EntityShaper):
	def serialize(self, connected_space: ConnectedSpace) -> EntityRow:
		row = {
			'connect_id': connected_space.connectId,
			'space_id': connected_space.spaceId,
			'name': connected_space.name,
			'subject_ids': connected_space.subjectIds,
			'is_template': connected_space.isTemplate
		}
		row = AuditableShaper.serialize(connected_space, row)
		row = UserBasedTupleShaper.serialize(connected_space, row)
		row = LastVisitShaper.serialize(connected_space, row)
		return row

	def deserialize(self, row: EntityRow) -> ConnectedSpace:
		connected_space = ConnectedSpace(
			connectId=row.get('connect_id'),
			spaceId=row.get('space_id'),
			name=row.get('name'),
			subjectIds=row.get('subject_ids'),
			isTemplate=row.get('is_template')
		)
		# noinspection PyTypeChecker
		connected_space: ConnectedSpace = AuditableShaper.deserialize(row, connected_space)
		# noinspection PyTypeChecker
		connected_space: ConnectedSpace = UserBasedTupleShaper.deserialize(row, connected_space)
		# noinspection PyTypeChecker
		connected_space: ConnectedSpace = LastVisitShaper.deserialize(row, connected_space)
		return connected_space


CONNECTED_SPACE_ENTITY_NAME = 'connected_spaces'
CONNECTED_SPACE_ENTITY_SHAPER = ConnectedSpaceShaper()


class ConnectedSpaceService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return CONNECTED_SPACE_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return CONNECTED_SPACE_ENTITY_SHAPER

	def get_tuple_id_column_name(self) -> str:
		return 'connect_id'

	def get_tuple_id(self, a_tuple: ConnectedSpace) -> ConnectedSpaceId:
		return a_tuple.connectId

	def set_tuple_id(self, a_tuple: ConnectedSpace, tuple_id: ConnectedSpaceId) -> ConnectedSpace:
		a_tuple.connectId = tuple_id
		return a_tuple
