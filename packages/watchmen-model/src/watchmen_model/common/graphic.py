from .model import DataModel


class GraphicPosition(DataModel):
	x: float = 0
	y: float = 0


class GraphicSize(DataModel):
	width: float = 0
	height: float = 0


class GraphicRect(GraphicPosition, GraphicSize):
	pass
