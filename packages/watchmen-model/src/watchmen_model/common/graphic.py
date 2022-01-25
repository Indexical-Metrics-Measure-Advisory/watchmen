from pydantic import BaseModel


class GraphicPosition(BaseModel):
	x: float = 0
	y: float = 0


class GraphicSize(BaseModel):
	width: float = 0
	height: float = 0


class GraphicRect(GraphicPosition, GraphicSize):
	pass
