from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel

from watchmen_auth import PrincipalService
from watchmen_model.common import DataModel
from watchmen_model.indicator import Achievement, AchievementIndicator, MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID, \
	REFERENCE_ACHIEVEMENT_INDICATOR_ID
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds
from .data_helper import get_achievement_indicator_data_service


class AchievementIndicatorFormula:
	def __init__(self, indicator: AchievementIndicator):
		self.compiled = self.parse(indicator.formula)

	def parse(self, formula: Optional[str]):
		# TODO parse formula
		pass

	def calculate(self, result: AchievementIndicatorResult):
		# TODO calculate
		pass


class AchievementIndicatorResult:
	def __init__(self, indicator: AchievementIndicator):
		self.indicator = indicator
		self.compiledFormula = AchievementIndicatorFormula(indicator)
		self.current = Decimal('0')
		self.score: Optional[Decimal] = None
		self.previousRange: Optional[Decimal] = None
		self.previousRangeScore: Optional[Decimal] = None
		self.previousRangeIncrementRatio: Optional[Decimal] = None
		self.previousCycle: Optional[Decimal] = None
		self.previousCycleScore: Optional[Decimal] = None
		self.previousCycleIncrementRatio: Optional[Decimal] = None
		self.calculated: bool = False


class AchievementResult(BaseModel, DataModel):
	score: Decimal
	previousRangeScore: Optional[Decimal]
	previousRangeIncrementRatio: Optional[Decimal]
	previousCycleScore: Optional[Decimal]
	previousCycleIncrementRatio: Optional[Decimal]
	indicatorResults: List[AchievementIndicatorResult]


class AchievementDataService:
	def __init__(self, achievement: Achievement, principal_service: PrincipalService):
		self.achievement = achievement
		self.principalService = principal_service

	# noinspection PyMethodMayBeStatic
	def create_indicator_result(self, indicator: AchievementIndicator) -> AchievementIndicatorResult:
		return AchievementIndicatorResult(indicator=indicator)

	# noinspection PyMethodMayBeStatic
	def is_regular(self, result: AchievementIndicatorResult) -> bool:
		return \
			result.indicator.indicatorId != MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID \
			and result.indicator.indicatorId != REFERENCE_ACHIEVEMENT_INDICATOR_ID

	# noinspection PyMethodMayBeStatic
	def calculate_increment_ratio(self, now: Optional[Decimal], previous: Optional[Decimal]) -> Optional[Decimal]:
		"""
		return percentage value
		"""
		if now is None:
			return Decimal('0')
		elif previous is None or previous == 0:
			return Decimal('100')
		else:
			return (now - previous) / previous * 100

	def calculate_score_and_ratio(self, result: AchievementIndicatorResult):
		# TODO calculate score and ratio
		pass

	def ask_regular_indicator_value(self, result: AchievementIndicatorResult):
		now = get_current_time_in_seconds()
		# current value
		service = get_achievement_indicator_data_service(result.indicator, now, self.principalService)
		result.current = service.ask_value()
		if self.achievement.compareWithPreviousTimeRange:
			# to previous month, month to month
			previous_month = now.replace(day=1) - timedelta(days=1)
			service = get_achievement_indicator_data_service(result.indicator, previous_month, self.principalService)
			result.previousRange = service.ask_value()
			result.previousRangeIncrementRatio = \
				self.calculate_increment_ratio(result.current, result.previousRange)
		if self.achievement.compareWithPreviousCycle:
			# to previous year
			previous_cycle = now.replace(year=now.year - 1)
			service = get_achievement_indicator_data_service(result.indicator, previous_cycle, self.principalService)
			result.previousCycle = service.ask_value()
			result.previousCycleIncrementRatio = \
				self.calculate_increment_ratio(result.current, result.previousCycle)

		self.calculate_score_and_ratio(result)

	def ask_value(self) -> AchievementResult:
		results = ArrayHelper(self.achievement.indicators).map(self.create_indicator_result).to_list()

		ArrayHelper(results).filter(self.is_regular).each(self.ask_regular_indicator_value)

		# TODO calculate referred achievements and compute indicators
		return AchievementResult()
