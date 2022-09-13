from abc import abstractmethod
from typing import List, Optional, Tuple, Union

from watchmen_auth import PrincipalService
from watchmen_model.admin import Factor, FactorType
from watchmen_model.common import ComputedParameter, DataResult, DataResultSet, FactorId, ParameterComputeType, \
	ParameterKind, SubjectDatasetColumnId, TopicFactorParameter, TopicId
from watchmen_model.console import ReportIndicator, ReportIndicatorArithmetic, SubjectDatasetColumn
from watchmen_model.console.subject import SubjectColumnArithmetic
from watchmen_model.indicator import IndicatorAggregateArithmetic, Inspection, MeasureMethod
from watchmen_utilities import is_blank
from .indicator_criteria_service import IndicatorCriteriaService


class InspectionDataService(IndicatorCriteriaService):
	def __init__(self, inspection: Inspection, principal_service: PrincipalService):
		super().__init__(principal_service)
		self.inspection = inspection
		self.TIME_GROUP_YEAR_OR_MONTH_COLUMN_ID: str = 'time_group_year_or_month_column'

	def has_time_group(self) -> Tuple[bool, Optional[FactorId], Optional[MeasureMethod]]:
		measure_on_time_factor_id = self.inspection.measureOnTimeFactorId
		if is_blank(measure_on_time_factor_id):
			return False, None, None
		measure_on_time = self.inspection.measureOnTime
		if measure_on_time is None:
			return False, None, None

		return True, measure_on_time_factor_id, measure_on_time

	# noinspection PyMethodMayBeStatic
	def is_datetime_factor(self, factor_or_type: Union[Factor, FactorType]) -> bool:
		factor_type = factor_or_type.type if isinstance(factor_or_type, Factor) else factor_or_type
		return \
			factor_type == FactorType.DATETIME \
			or factor_type == FactorType.FULL_DATETIME \
			or factor_type == FactorType.DATE \
			or factor_type == FactorType.DATE_OF_BIRTH

	def fake_time_group_year_or_month_column(
			self, topic_id: TopicId, factor_id: FactorId, name: str) -> Optional[SubjectDatasetColumn]:
		"""
		fake year or month column according to measureOnTime.
		returns column only when measure on year or month, otherwise return none.
		"""
		# fake a new column into subject
		if self.inspection.measureOnTime == MeasureMethod.YEAR:
			return SubjectDatasetColumn(
				columnId=self.TIME_GROUP_YEAR_OR_MONTH_COLUMN_ID,
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED,
					type=ParameterComputeType.YEAR_OF,
					parameters=[
						TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)
					]
				),
				alias=f'{name}_YEAR_',
				arithmetic=SubjectColumnArithmetic.NONE
			)
		elif self.inspection.measureOnTime == MeasureMethod.MONTH:
			return SubjectDatasetColumn(
				columnId=self.TIME_GROUP_YEAR_OR_MONTH_COLUMN_ID,
				parameter=ComputedParameter(
					kind=ParameterKind.COMPUTED,
					type=ParameterComputeType.MONTH_OF,
					parameters=[
						TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)
					]
				),
				alias=f'{name}_MONTH_',
				arithmetic=SubjectColumnArithmetic.NONE
			)
		else:
			return None

	def fake_report_indicator(self, indicators: List[ReportIndicator], columnId: SubjectDatasetColumnId) -> None:
		arithmetics = self.inspection.aggregateArithmetics
		if arithmetics is None or len(arithmetics) == 0:
			indicators.append(
				ReportIndicator(columnId=columnId, name='_SUM_', arithmetic=ReportIndicatorArithmetic.SUMMARY))
		else:
			if IndicatorAggregateArithmetic.COUNT in arithmetics or IndicatorAggregateArithmetic.COUNT.value in arithmetics:
				indicators.append(
					ReportIndicator(columnId=columnId, name='_COUNT_', arithmetic=ReportIndicatorArithmetic.COUNT))
			if IndicatorAggregateArithmetic.SUM in arithmetics or IndicatorAggregateArithmetic.SUM.value in arithmetics:
				indicators.append(
					ReportIndicator(columnId=columnId, name='_SUM_', arithmetic=ReportIndicatorArithmetic.SUMMARY))
			if IndicatorAggregateArithmetic.AVG in arithmetics or IndicatorAggregateArithmetic.AVG.value in arithmetics:
				indicators.append(
					ReportIndicator(columnId=columnId, name='_AVG_', arithmetic=ReportIndicatorArithmetic.AVERAGE))
			if IndicatorAggregateArithmetic.MAX in arithmetics or IndicatorAggregateArithmetic.MAX.value in arithmetics:
				indicators.append(
					ReportIndicator(columnId=columnId, name='_MAX_', arithmetic=ReportIndicatorArithmetic.MAXIMUM))
			if IndicatorAggregateArithmetic.MIN in arithmetics or IndicatorAggregateArithmetic.MIN.value in arithmetics:
				indicators.append(
					ReportIndicator(columnId=columnId, name='_MIN_', arithmetic=ReportIndicatorArithmetic.MINIMUM))

	@abstractmethod
	def find(self) -> DataResult:
		pass

	def find_data(self) -> DataResultSet:
		return self.find().data
