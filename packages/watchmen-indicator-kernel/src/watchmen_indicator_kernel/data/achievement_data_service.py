from abc import abstractmethod
from decimal import Decimal
from typing import Callable, Optional

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.admin import Factor, FactorType
from watchmen_model.common import ComputedParameter, FactorId, Parameter, ParameterComputeType, ParameterKind, \
	TopicFactorParameter, TopicId
from watchmen_model.console import Report, ReportIndicator, ReportIndicatorArithmetic
from watchmen_model.indicator import AchievementIndicator, IndicatorAggregateArithmetic
from .indicator_criteria_service import IndicatorCriteriaService


class AchievementDataService(IndicatorCriteriaService):
	def __init__(self, achievement_indicator: AchievementIndicator, principal_service: PrincipalService):
		super().__init__(principal_service)
		self.achievementIndicator = achievement_indicator

	# noinspection PyMethodMayBeStatic
	def has_year_or_month(self, factor: Factor) -> bool:
		return \
			factor.type == FactorType.DATETIME \
			or factor.type == FactorType.FULL_DATETIME \
			or factor.type == FactorType.DATE \
			or factor.type == FactorType.DATE_OF_BIRTH

	def build_value_criteria_left_on_factor(
			self, topic_id: TopicId, factor_id: FactorId, value: Optional[str],
			ask_factor: Callable[[], Factor]
	) -> Parameter:
		value = value.strip()
		value_length = len(value.strip())
		if value_length != 1 and value_length != 2 and value_length != 4:
			# not month or year
			return self.build_topic_factor_parameter(topic_id, factor_id)

		factor: Factor = ask_factor()
		if not self.has_year_or_month(factor):
			return self.build_topic_factor_parameter(topic_id, factor_id)

		if value_length == 4:
			# year
			return ComputedParameter(
				kind=ParameterKind.COMPUTED,
				type=ParameterComputeType.YEAR_OF,
				parameters=[TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)]
			)
		else:
			# month
			return ComputedParameter(
				kind=ParameterKind.COMPUTED,
				type=ParameterComputeType.MONTH_OF,
				parameters=[TopicFactorParameter(kind=ParameterKind.TOPIC, topicId=topic_id, factorId=factor_id)]
			)

	def fake_to_report(self) -> Callable[[FactorId], Report]:
		def action(factor_id: FactorId) -> Report:
			arithmetic = self.achievementIndicator.aggregateArithmetic
			if arithmetic is None:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_SUM_', arithmetic=ReportIndicatorArithmetic.SUMMARY)
			elif IndicatorAggregateArithmetic.COUNT == arithmetic or IndicatorAggregateArithmetic.COUNT.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_COUNT_', arithmetic=ReportIndicatorArithmetic.COUNT)
			elif IndicatorAggregateArithmetic.SUM == arithmetic or IndicatorAggregateArithmetic.SUM.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_SUM_', arithmetic=ReportIndicatorArithmetic.SUMMARY)
			elif IndicatorAggregateArithmetic.AVG == arithmetic or IndicatorAggregateArithmetic.AVG.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_AVG_', arithmetic=ReportIndicatorArithmetic.AVERAGE)
			elif IndicatorAggregateArithmetic.MAX == arithmetic or IndicatorAggregateArithmetic.MAX.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_MAX_', arithmetic=ReportIndicatorArithmetic.MAXIMUM)
			elif IndicatorAggregateArithmetic.MIN == arithmetic or IndicatorAggregateArithmetic.MIN.value == arithmetic:
				report_indicator = ReportIndicator(
					columnId=factor_id, name='_MIN_', arithmetic=ReportIndicatorArithmetic.MINIMUM)
			else:
				raise IndicatorKernelException(f'Indicator aggregate arithmetics[{arithmetic}] is not supported.')

			return Report(indicators=[report_indicator], dimensions=[])

		return action

	@abstractmethod
	def ask_value(self) -> Optional[Decimal]:
		pass
