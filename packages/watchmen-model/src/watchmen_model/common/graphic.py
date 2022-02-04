from pydantic import BaseModel

from .model import DataModel


class GraphicPosition(DataModel, BaseModel):
	x: float = 0
	y: float = 0


class GraphicSize(DataModel, BaseModel):
	width: float = 0
	height: float = 0


class GraphicRect(GraphicPosition, GraphicSize):
	pass
