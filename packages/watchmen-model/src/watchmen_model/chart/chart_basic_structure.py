from enum import Enum

from pydantic import BaseModel

from watchmen_model.common import DataModel


class ChartTruncationType(str, Enum):
	NONE = 'none',
	TOP = 'top',
	BOTTOM = 'bottom'


class ChartTruncation(DataModel, BaseModel):
	type: ChartTruncationType = ChartTruncationType.NONE
	count: int = 20


class ChartTruncationHolder(DataModel, BaseModel):
	truncation: ChartTruncation = None
