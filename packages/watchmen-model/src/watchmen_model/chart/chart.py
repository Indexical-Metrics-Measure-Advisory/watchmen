from pydantic import BaseModel

from watchmen_model.common import DataModel
from .chart_settings import ChartSettings
from .chart_types import ChartType


class Chart(DataModel, BaseModel):
	type: ChartType = ChartType.COUNT
	settings: ChartSettings = None

	def __setattr__(self, name, value):
		if name == 'settings':
			if self.type is not None:
				super().__setattr__(name, construct_settings(value, self.type))
		elif name == 'type':
			if self.settings is not None:
				super().__setattr__(name, construct_settings(self.settings, value))
		else:
			super().__setattr__(name, value)
