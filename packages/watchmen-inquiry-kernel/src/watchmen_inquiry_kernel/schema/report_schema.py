from typing import Any, Dict, List, Optional

from watchmen_model.chart import ChartTruncationType
from watchmen_model.console import Report, ReportDimension, ReportIndicator
from watchmen_utilities import ArrayHelper, is_blank


class ReportSchema:
	def __init__(self, report: Report):
		self.report = report

	def get_report(self) -> Report:
		return self.report

	# noinspection PyMethodMayBeStatic
	def as_indicator_name(self, indicator: ReportIndicator, index: int) -> str:
		if is_blank(indicator.name):
			return f'indicator_{index + 1}'
		else:
			return indicator.name

	# noinspection PyMethodMayBeStatic
	def as_dimension_name(self, dimension: ReportDimension, index: int) -> str:
		if is_blank(dimension.name):
			return f'dimension_{index + 1}'
		else:
			return dimension.name

	def get_result_columns(self) -> List[str]:
		return [
			*ArrayHelper(self.get_report().indicators).map_with_index(
				lambda x, index: self.as_indicator_name(x, index)).to_list(),
			*ArrayHelper(self.get_report().dimensions).map_with_index(
				lambda x, index: self.as_dimension_name(x, index)).to_list()
		]

	def get_sort_type(self) -> ChartTruncationType:
		chart = self.get_report().chart
		if chart is not None and chart.settings is not None and chart.settings.truncation is not None:
			return chart.settings.truncation.type
		return ChartTruncationType.NONE

	def get_truncation_count(self) -> Optional[int]:
		chart = self.get_report().chart
		if chart is not None and chart.settings is not None and chart.settings.truncation is not None:
			if is_blank(chart.settings.truncation.count):
				return None
			return chart.settings.truncation.count
		return None

	def translate_to_array_row(self, row: Dict[str, Any]) -> List[Any]:
		return [
			*ArrayHelper(self.get_report().indicators).map_with_index(
				lambda x, index: row.get(self.as_indicator_name(x, index))).to_list(),
			*ArrayHelper(self.get_report().dimensions).map_with_index(
				lambda x, index: row.get(self.as_dimension_name(x, index))).to_list()
		]

	def translate_to_array_table(self, data: List[Dict[str, Any]]) -> List[List[Any]]:
		return ArrayHelper(data).map(self.translate_to_array_row).to_list()
