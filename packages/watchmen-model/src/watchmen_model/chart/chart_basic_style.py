from typing import Optional
from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import DataModel
from .chart_enums import ChartBorderStyle, ChartFontStyle, ChartFontWeight
from .chart_types import ChartColor


class ChartFont(DataModel, ExtendedBaseModel):
	family: Optional[str] = None
	size: Optional[float] = None
	color: Optional[ChartColor] = None
	style: Optional[ChartFontStyle] = None
	weight: Optional[ChartFontWeight] = None


class ChartBorder(DataModel, ExtendedBaseModel):
	color: Optional[ChartColor] = None
	style: Optional[ChartBorderStyle] = None
	width: Optional[float] = None
	radius: Optional[float] = None
