from enum import Enum

from pydantic import BaseModel


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
	CUSTOM = 'customized'


class Chart(BaseModel):
	type: ChartType = ChartType.COUNT
	settings: dict = None
