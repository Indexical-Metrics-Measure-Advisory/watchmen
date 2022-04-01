from typing import Any

from pydantic import BaseModel

from .chart_basic_structure import ChartTruncation, ChartTruncationHolder
from .chart_basic_style import ChartBorder
from .chart_enums import PredefinedChartColorSeries
from .chart_types import ChartColor


class ChartSettings(ChartTruncationHolder, BaseModel):
	border: ChartBorder = None
	backgroundColor: ChartColor = None

	colorSeries: PredefinedChartColorSeries = PredefinedChartColorSeries.REGULAR

	# noinspection PyMethodMayBeStatic,PyUnusedLocal
	def handle_attr(self, name, value) -> Any:
		return value

	def __setattr__(self, name, value):
		if name == 'truncation':
			if isinstance(value, ChartTruncation):
				super().__setattr__(name, value)
			else:
				super().__setattr__(name, ChartTruncation(**value))
		else:
			super().__setattr__(name, self.handle_attr(name, value))
