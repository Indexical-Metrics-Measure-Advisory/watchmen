from datetime import datetime
from enum import Enum
from typing import List, Union

from pydantic import BaseModel

from watchmen_model.chart import Chart
from watchmen_model.common import DataResultSet, GraphicRect, ParameterJoint, ReportFunnelId, ReportId, \
	SubjectDatasetColumnId, TenantId, Tuple, UserId


class ReportIndicatorArithmetic(str, Enum):
	NONE = 'none'
	COUNT = 'count'
	SUMMARY = 'sum'
	AVERAGE = 'avg'
	MAXIMUM = 'max'
	MINIMUM = 'min'


class ReportIndicator(BaseModel):
	columnId: SubjectDatasetColumnId = None
	name: str = None
	arithmetic: ReportIndicatorArithmetic = ReportIndicatorArithmetic.NONE


class ReportDimension(BaseModel):
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


class ReportFunnel(BaseModel):
	funnelId: ReportFunnelId = None
	columnId: SubjectDatasetColumnId = None
	type: ReportFunnelType = None
	range: bool = False
	enabled: bool = False
	values: List[Union[str, None]] = None


class Report(Tuple):
	reportId: ReportId = None
	name: str = None
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
	userId: UserId = None
	tenantId: TenantId = None
	lastVisitTime: datetime = datetime.now().replace(tzinfo=None)
