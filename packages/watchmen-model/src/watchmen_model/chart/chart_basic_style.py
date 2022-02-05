from pydantic import BaseModel

from watchmen_model.common import DataModel
from .chart_enums import ChartBorderStyle, ChartFontStyle, ChartFontWeight
from .chart_types import ChartColor


class ChartFont(DataModel, BaseModel):
	family: str = None
	size: float = None
	color: ChartColor = None
	style: ChartFontStyle = None
	weight: ChartFontWeight = None


class ChartBorder(DataModel, BaseModel):
	color: ChartColor = None
	style: ChartBorderStyle = None
	width: float = None
	radius: float = None
