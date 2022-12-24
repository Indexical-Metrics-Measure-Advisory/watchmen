from abc import abstractmethod
from decimal import Decimal
from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.common import SubjectDatasetColumnId
from watchmen_model.console import Report, ReportIndicator, ReportIndicatorArithmetic
from watchmen_model.indicator import Indicator, IndicatorAggregateArithmetic, Objective, ObjectiveFactorOnIndicator
from ..objective_criteria_service import ObjectiveCriteriaService


class ObjectiveFactorDataService(ObjectiveCriteriaService):
	def __init__(
			self, objective: Objective, objective_factor: ObjectiveFactorOnIndicator, indicator: Indicator,
			principal_service: PrincipalService):
		super().__init__(objective, objective_factor, indicator, principal_service)

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

	@abstractmethod
	def ask_value(self) -> Optional[Decimal]:
		pass
