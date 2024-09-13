from enum import Enum
from typing import Optional

from watchmen_utilities import ExtendedBaseModel
from watchmen_model.common import DataModel


class ChartTruncationType(str, Enum):
	NONE = 'none',
	TOP = 'top',
	BOTTOM = 'bottom'


class ChartTruncation(ExtendedBaseModel):
	type: ChartTruncationType = ChartTruncationType.NONE
	count: int = 20


class ChartTruncationHolder(ExtendedBaseModel):
	truncation: Optional[ChartTruncation] = None
