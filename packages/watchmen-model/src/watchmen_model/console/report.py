from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.chart import BarChart, Chart, ChartType, CountChart, CustomizedChart, DoughnutChart, LineChart, \
	MapChart, NightingaleChart, PieChart, ScatterChart, SunburstChart, TreeChart, TreemapChart
from watchmen_model.common import Auditable, ConnectedSpaceId, construct_parameter_joint, DataModel, DataResultSet, \
	GraphicRect, LastVisit, ParameterJoint, ReportFunnelId, ReportId, SubjectDatasetColumnId, SubjectId, UserBasedTuple
from watchmen_utilities import ArrayHelper
from .utils import construct_rect


class ReportIndicatorArithmetic(str, Enum):
	NONE = 'none'
	COUNT = 'count'
	SUMMARY = 'sum'
	AVERAGE = 'avg'
	MAXIMUM = 'max'
	MINIMUM = 'min'


class ReportIndicator(DataModel, BaseModel):
	columnId: SubjectDatasetColumnId = None
	name: str = None
	arithmetic: ReportIndicatorArithmetic = ReportIndicatorArithmetic.NONE


class ReportDimension(DataModel, BaseModel):
	columnId: SubjectDatasetColumnId = None
	name: str = None


class ReportFunnelType(str, Enum):
	NUMERIC = 'numeric',
	DATE = 'date',
	YEAR = 'year',
	HALF_YEAR = 'half-year',
	QUARTER = 'quarter',
	MONTH = 'month',
	HALF_MONTH = 'half-month',
	TEN_DAYS = 'ten-days',
	WEEK_OF_MONTH = 'week-of-month',
	HALF_WEEK = 'half-week',
	DAY_KIND = 'day-kind',
	DAY_OF_WEEK = 'day-of-week',
	HOUR = 'hour',
	HOUR_KIND = 'hour-kind',
	AM_PM = 'am-pm',
	ENUM = 'enum'


class ReportFunnel(DataModel, BaseModel):
	funnelId: ReportFunnelId = None
	columnId: SubjectDatasetColumnId = None
	type: ReportFunnelType = None
	range: bool = False
	enabled: bool = False
	values: List[Union[str, None]] = None


def construct_chart(chart: Optional[Union[dict, Chart]]) -> Optional[Chart]:
	if chart is None:
		return None
	elif isinstance(chart, Chart):
		return chart
	else:
		chart_type = chart.get('type')
		if chart_type == ChartType.COUNT:
			return CountChart(**chart)
		elif chart_type == ChartType.BAR:
			return BarChart(**chart)
		elif chart_type == ChartType.LINE:
			return LineChart(**chart)
		elif chart_type == ChartType.SCATTER:
			return ScatterChart(**chart)
		elif chart_type == ChartType.PIE:
			return PieChart(**chart)
		elif chart_type == ChartType.DOUGHNUT:
			return DoughnutChart(**chart)
		elif chart_type == ChartType.NIGHTINGALE:
			return NightingaleChart(**chart)
		elif chart_type == ChartType.SUNBURST:
			return SunburstChart(**chart)
		elif chart_type == ChartType.TREE:
			return TreeChart(**chart)
		elif chart_type == ChartType.TREEMAP:
			return TreemapChart(**chart)
		elif chart_type == ChartType.MAP:
			return MapChart(**chart)
		elif chart_type == ChartType.CUSTOMIZED:
			return CustomizedChart(**chart)
		else:
			raise Exception(f'Chart type[{chart_type}] cannot be recognized.')


def construct_funnel(funnel: Optional[Union[dict, ReportFunnel]]) -> Optional[ReportFunnel]:
	if funnel is None:
		return None
	elif isinstance(funnel, ReportFunnel):
		return funnel
	else:
		return ReportFunnel(**funnel)


def construct_funnels(funnels: List[Union[dict, ReportFunnel]]) -> List[ReportFunnel]:
	if funnels is None:
		return []
	return ArrayHelper(funnels).map(lambda x: construct_funnel(x)).to_list()


def construct_indicator(indicator: Optional[Union[dict, ReportIndicator]]) -> Optional[ReportIndicator]:
	if indicator is None:
		return None
	elif isinstance(indicator, ReportIndicator):
		return indicator
	else:
		return ReportIndicator(**indicator)


def construct_indicators(indicators: List[Union[dict, ReportIndicator]]) -> List[ReportIndicator]:
	if indicators is None:
		return []
	return ArrayHelper(indicators).map(lambda x: construct_indicator(x)).to_list()


def construct_dimension(dimension: Optional[Union[dict, ReportDimension]]) -> Optional[ReportDimension]:
	if dimension is None:
		return None
	elif isinstance(dimension, ReportDimension):
		return dimension
	else:
		return ReportDimension(**dimension)


def construct_dimensions(dimensions: List[Union[dict, ReportDimension]]) -> List[ReportDimension]:
	if dimensions is None:
		return []
	return ArrayHelper(dimensions).map(lambda x: construct_dimension(x)).to_list()


# noinspection PyRedundantParentheses
class AvoidFastApiError:
	filters: ParameterJoint = None


class Report(UserBasedTuple, Auditable, LastVisit, AvoidFastApiError, BaseModel):
	reportId: ReportId = None
	name: str = None
	subjectId: SubjectId = None
	connectId: ConnectedSpaceId = None
	funnels: List[ReportFunnel] = None
	indicators: List[ReportIndicator] = None
	dimensions: List[ReportDimension] = None
	description: str = None
	rect: GraphicRect = None
	chart: Chart = None
	simulating: bool = False
	simulateData: DataResultSet = None
	# base64
	simulateThumbnail: str = None

	def __setattr__(self, name, value):
		if name == 'filters':
			super().__setattr__(name, construct_parameter_joint(value))
		elif name == 'chart':
			super().__setattr__(name, construct_chart(value))
		elif name == 'rect':
			super().__setattr__(name, construct_rect(value))
		elif name == 'funnels':
			super().__setattr__(name, construct_funnels(value))
		elif name == 'indicators':
			super().__setattr__(name, construct_indicators(value))
		elif name == 'dimensions':
			super().__setattr__(name, construct_dimensions(value))
		else:
			super().__setattr__(name, value)
