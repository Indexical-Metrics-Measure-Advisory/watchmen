from watchmen_utilities import ExtendedBaseModel
from .model import DataModel


class GraphicPosition(ExtendedBaseModel):
	x: float = 0
	y: float = 0


class GraphicSize(ExtendedBaseModel):
	width: float = 0
	height: float = 0


class GraphicRect(GraphicPosition, GraphicSize):
	pass
