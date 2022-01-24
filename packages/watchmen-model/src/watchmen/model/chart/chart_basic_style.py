from pydantic import BaseModel

from watchmen.model.chart.chart_enums import ChartBorderStyle, ChartFontStyle, ChartFontWeight
from watchmen.model.chart.chart_types import ChartColor


class ChartFont(BaseModel):
	family: str = None
	size: float = None
	color: ChartColor = None
	style: ChartFontStyle = None
	weight: ChartFontWeight = None


class ChartBorder(BaseModel):
	color: ChartColor = None
	style: ChartBorderStyle = None
	width: float = None
	radius: float = None
