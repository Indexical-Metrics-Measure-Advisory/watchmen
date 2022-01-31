from enum import Enum

from watchmen_model.common import DataModel


class ChartTruncationType(str, Enum):
	NONE = 'none',
	TOP = 'top',
	BOTTOM = 'bottom'


class ChartTruncation(DataModel):
	type: ChartTruncationType = ChartTruncationType.NONE
	count: int = 20


class ChartTruncationHolder(DataModel):
	truncation: ChartTruncation = None
