from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.chart import Chart
from watchmen_model.common import Auditable, ConnectedSpaceId, construct_parameter_joint, DataModel, DataResultSet, \
	GraphicRect, \
	LastVisit, ParameterJoint, \
	ReportFunnelId, ReportId, SubjectDatasetColumnId, SubjectId, UserBasedTuple


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
		return Chart(**chart)


class Report(UserBasedTuple, Auditable, LastVisit, BaseModel):
	reportId: ReportId = None
	name: str = None
	subjectId: SubjectId = None
	connectId: ConnectedSpaceId = None
	filters: ParameterJoint = None
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
		else:
			super().__setattr__(name, value)
