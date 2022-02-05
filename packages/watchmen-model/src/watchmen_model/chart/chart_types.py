from enum import Enum
from typing import TypeVar

ChartColor = TypeVar("ChartColor", bound=str)


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
