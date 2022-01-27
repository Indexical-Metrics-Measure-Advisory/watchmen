from enum import Enum

from pydantic import BaseModel

from .chart_basic_structure import ChartTruncationHolder
from .chart_basic_style import ChartBorder
from .chart_enums import PredefinedChartColorSeries
from .chart_types import ChartColor


class ChartType(str, Enum):
	COUNT = 'count'
	BAR = 'bar'
	LINE = 'line'
	SCATTER = 'scatter'
	PIE = 'pie'
	DOUGHNUT = 'doughnut'
	NIGHTINGALE = 'nightingale'
	SUNBURST = 'sunburst'
	TREE = 'tree'
	TREEMAP = 'treemap'
	MAP = 'map'
	CUSTOMIZED = 'customized'


class ChartSettings(ChartTruncationHolder):
	border: ChartBorder = None
	backgroundColor: ChartColor = None

	colorSeries: PredefinedChartColorSeries = PredefinedChartColorSeries.REGULAR


class Chart(BaseModel):
	type: ChartType = ChartType.COUNT
	settings: ChartSettings = None
