from abc import abstractmethod
from decimal import Decimal
from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.common import DataResult, ParameterJoint, SubjectDatasetColumnId
from watchmen_model.console import Report, ReportIndicator, ReportIndicatorArithmetic
from watchmen_model.indicator import Indicator, IndicatorAggregateArithmetic, Objective, ObjectiveFactorOnIndicator
from watchmen_utilities import ArrayHelper, is_decimal
from ..objective_criteria_service import ObjectiveCriteriaService, TimeFrame


class ObjectiveFactorDataService(ObjectiveCriteriaService):
	def __init__(
			self, objective: Objective, objective_factor: ObjectiveFactorOnIndicator, indicator: Indicator,
			principal_service: PrincipalService):
		super().__init__(objective, objective_factor, indicator, principal_service)

	def fake_criteria_to_filter(self, time_frame: Optional[TimeFrame]) -> Optional[ParameterJoint]:
		objective_factor = self.get_objective_factor()
		if not objective_factor.conditional:
			# ask all data
			return None

		factor_filter = objective_factor.filter

		if factor_filter is None or factor_filter.filters is None:
			# no filter declared
			return None

		conditions = ArrayHelper(factor_filter.filters).filter(lambda x: x is not None).to_list()
		if len(conditions) == 0:
			return None

		return ParameterJoint(
			jointType=self.as_joint_type(factor_filter.conj),
			filters=self.translate_parameter_conditions(conditions, time_frame))

	def fake_to_report(self, column_id: SubjectDatasetColumnId) -> Report:
		"""
		create report by given column, which only contains a report indicator with arithmetic appointed by indicator of factor
		"""

		def match_arithmetic(one: IndicatorAggregateArithmetic, to_be: IndicatorAggregateArithmetic) -> bool:
			return to_be == one or to_be.value == one

		arithmetic = self.get_indicator().aggregateArithmetic
		if arithmetic is None:
			arithmetic = IndicatorAggregateArithmetic.SUM

		if match_arithmetic(arithmetic, IndicatorAggregateArithmetic.COUNT):
			report_indicator_name = '_COUNT_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.COUNT

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.SUM):
			report_indicator_name = '_SUM_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.SUMMARY

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.AVG):
			report_indicator_name = '_AVG_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.AVERAGE

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.MAX):
			report_indicator_name = '_MAX_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.MAXIMUM

		elif match_arithmetic(arithmetic, IndicatorAggregateArithmetic.MIN):
			report_indicator_name = '_MIN_'
			report_indicator_arithmetic = ReportIndicatorArithmetic.MINIMUM
		else:
			raise IndicatorKernelException(f'Indicator aggregate arithmetics[{arithmetic}] is not supported.')

		return Report(indicators=[
			ReportIndicator(columnId=column_id, name=report_indicator_name, arithmetic=report_indicator_arithmetic)
		], dimensions=[])

	# noinspection PyMethodMayBeStatic
	def get_value_from_result(self, data_result: DataResult) -> Decimal:
		if len(data_result.data) == 0:
			return Decimal('0')
		else:
			value = data_result.data[0][0]
			parsed, decimal_value = is_decimal(value)
			return decimal_value if parsed else Decimal('0')

	@abstractmethod
	def ask_value(self, time_frame: Optional[TimeFrame]) -> Optional[Decimal]:
		pass
