from enum import Enum

from pydantic import BaseModel

from watchmen_model.chart.chart_basic_structure import ChartTruncationHolder
from watchmen_model.chart.chart_basic_style import ChartBorder
from watchmen_model.chart.chart_enums import PredefinedChartColorSeries
from watchmen_model.chart.chart_types import ChartColor


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
