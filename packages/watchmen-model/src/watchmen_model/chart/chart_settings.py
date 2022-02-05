from pydantic import BaseModel

from .chart_basic_structure import ChartTruncationHolder
from .chart_basic_style import ChartBorder
from .chart_enums import PredefinedChartColorSeries
from .chart_types import ChartColor


class ChartSettings(ChartTruncationHolder, BaseModel):
	border: ChartBorder = None
	backgroundColor: ChartColor = None

	colorSeries: PredefinedChartColorSeries = PredefinedChartColorSeries.REGULAR
