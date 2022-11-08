from typing import Optional, Union

from watchmen_meta.common import UserBasedTupleService, UserBasedTupleShaper
from watchmen_model.common import ConnectedSpaceId
from watchmen_model.console import ConnectedSpaceGraphic, SubjectGraphic, TopicGraphic
from watchmen_storage import EntityRow, EntityShaper
from watchmen_utilities import ArrayHelper


class ConnectedSpaceGraphicShaper(EntityShaper):
	# noinspection PyMethodMayBeStatic
	def serialize_to_dict(
			self, data: Optional[Union[dict, TopicGraphic, SubjectGraphic]]
	) -> Optional[dict]:
		if data is None:
			return None
		elif isinstance(data, dict):
			return data
		else:
			return data.dict()

	def serialize(self, connected_space_graphic: ConnectedSpaceGraphic) -> EntityRow:
		row = {
			'connect_id': connected_space_graphic.connectId,
			'topics': ArrayHelper(connected_space_graphic.topics).map(lambda x: self.serialize_to_dict(x)).to_list(),
			'subjects': ArrayHelper(connected_space_graphic.subjects).map(lambda x: self.serialize_to_dict(x)).to_list()
		}
		row = UserBasedTupleShaper.serialize(connected_space_graphic, row)
		return row

	def deserialize(self, row: EntityRow) -> ConnectedSpaceGraphic:
		connected_space_graphic = ConnectedSpaceGraphic(
			connectId=row.get('connect_id'),
			topics=row.get('topics'),
			subjects=row.get('subjects')
		)
		# noinspection PyTypeChecker
		connected_space_graphic: ConnectedSpaceGraphic = UserBasedTupleShaper.deserialize(row, connected_space_graphic)
		return connected_space_graphic


CONNECTED_SPACE_GRAPHIC_ENTITY_NAME = 'connected_space_graphics'
CONNECTED_SPACE_GRAPHIC_ENTITY_SHAPER = ConnectedSpaceGraphicShaper()


class ConnectedSpaceGraphicService(UserBasedTupleService):
	def get_entity_name(self) -> str:
		return CONNECTED_SPACE_GRAPHIC_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return CONNECTED_SPACE_GRAPHIC_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'connect_id'

	def get_storable_id(self, storable: ConnectedSpaceGraphic) -> ConnectedSpaceId:
		return storable.connectId

	def set_storable_id(self, storable: ConnectedSpaceGraphic, storable_id: ConnectedSpaceId) -> ConnectedSpaceGraphic:
		storable.connectId = storable_id
		return storable

	def should_record_operation(self) -> bool:
		return False
