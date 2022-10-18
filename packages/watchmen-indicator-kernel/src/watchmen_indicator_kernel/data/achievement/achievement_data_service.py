from decimal import Decimal
from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.common import IndicatorKernelException
from watchmen_model.indicator import Achievement, AchievementIndicator


class AchievementIndicatorResult:
	indicator: AchievementIndicator
	current: Decimal
	previous: Optional[Decimal]


class AchievementResult:
	current: Decimal
	previous: Optional[Decimal]
	indicators: List[AchievementIndicatorResult]


class AchievementDataService:
	def __init__(self, achievement: Achievement, principal_service: PrincipalService):
		super().__init__(principal_service)
		self.achievement = achievement

	def ask_value(self) -> AchievementResult:
		# TODO
		raise IndicatorKernelException('Not implemented yet.')
