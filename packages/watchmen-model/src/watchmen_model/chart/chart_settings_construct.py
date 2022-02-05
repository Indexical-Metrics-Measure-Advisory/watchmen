from typing import Optional, Union

from .chart_settings import ChartSettings
from .chart_types import ChartType
from .echarts import BarChartSettings, CustomizedChartSettings, DoughnutChartSettings, LineChartSettings, \
	MapChartSettings, NightingaleChartSettings, PieChartSettings, ScatterChartSettings, SunburstChartSettings, \
	TreeChartSettings, TreemapChartSettings


def construct_settings(
		settings: Optional[Union[dict, ChartSettings]], chart_type: ChartType) -> Optional[ChartSettings]:
	if settings is None:
		return None
	elif isinstance(settings, ChartSettings):
		return settings
	elif chart_type == ChartType.COUNT:
		return
	elif chart_type == ChartType.BAR:
		return BarChartSettings(**settings)
	elif chart_type == ChartType.LINE:
		return LineChartSettings(**settings)
	elif chart_type == ChartType.SCATTER:
		return ScatterChartSettings(**settings)
	elif chart_type == ChartType.PIE:
		return PieChartSettings(**settings)
	elif chart_type == ChartType.DOUGHNUT:
		return DoughnutChartSettings(**settings)
	elif chart_type == ChartType.NIGHTINGALE:
		return NightingaleChartSettings(**settings)
	elif chart_type == ChartType.SUNBURST:
		return SunburstChartSettings(**settings)
	elif chart_type == ChartType.TREE:
		return TreeChartSettings(**settings)
	elif chart_type == ChartType.TREEMAP:
		return TreemapChartSettings(**settings)
	elif chart_type == ChartType.MAP:
		return MapChartSettings(**settings)
	elif chart_type == ChartType.CUSTOMIZED:
		return CustomizedChartSettings(**settings)
	else:
		raise Exception(f'Chart type[{chart_type}] cannot be recognized.')
