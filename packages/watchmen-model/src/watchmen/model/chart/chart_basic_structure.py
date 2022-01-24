from enum import Enum

from pydantic import BaseModel


class ChartTruncationType(str, Enum):
	NONE = 'none',
	TOP = 'top',
	BOTTOM = 'bottom'


class ChartTruncation(BaseModel):
	type: ChartTruncationType = ChartTruncationType.NONE
	count: int = 20


class ChartTruncationHolder(BaseModel):
	truncation: ChartTruncation = None
