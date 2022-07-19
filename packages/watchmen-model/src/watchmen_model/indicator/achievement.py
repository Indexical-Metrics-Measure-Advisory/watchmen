from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import AchievementId, Auditable, DataModel, IndicatorId, UserBasedTuple
from watchmen_utilities import ArrayHelper
from .indicator import IndicatorAggregateArithmetic
from .indicator_criteria import construct_indicator_criteria_list, IndicatorCriteria


class AchievementIndicator(DataModel, BaseModel):
	indicatorId: IndicatorId = None
	name: str = None
	aggregateArithmetic: IndicatorAggregateArithmetic = None
	formula: str = None
	includeInFinalScore: bool = True
	criteria: List[IndicatorCriteria] = []
	variableName: str = None

	def __setattr__(self, name, value):
		if name == 'criteria':
			super().__setattr__(name, construct_indicator_criteria_list(value))
		else:
			super().__setattr__(name, value)


MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID = '-1'


class ManualComputeAchievementIndicator(AchievementIndicator):
	"""
	for manual compute indicator,
	1. indicatorId fixed as {@link MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID},
	2. aggregateArithmetics fixed as {@link IndicatorAggregateArithmetic#MAX}, will be ignored anyway in runtime
	3. criteria fixed as zero length array, will be ignored anyway in runtime
	"""
	indicatorId: IndicatorId = MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID
	aggregateArithmetic: IndicatorAggregateArithmetic = IndicatorAggregateArithmetic.MAX


class AchievementTimeRangeType(str, Enum):
	YEAR = 'year',
	MONTH = 'month'


def construct_indicator(indicator: Optional[Union[dict, AchievementIndicator]]) -> Optional[AchievementIndicator]:
	if indicator is None:
		return None
	elif isinstance(indicator, AchievementIndicator):
		return indicator
	else:
		indicator_id = indicator.get('indicatorId')
		if indicator_id == MANUAL_COMPUTE_ACHIEVEMENT_INDICATOR_ID:
			return ManualComputeAchievementIndicator(**indicator)
		else:
			return AchievementIndicator(**indicator)


def construct_indicators(indicators: Optional[list] = None) -> Optional[List[AchievementIndicator]]:
	if indicators is None:
		return None
	else:
		return ArrayHelper(indicators).map(lambda x: construct_indicator(x)).to_list()


class Achievement(UserBasedTuple, Auditable, BaseModel):
	achievementId: AchievementId = None
	name: str = None
	description: str = None
	timeRangeType: AchievementTimeRangeType = AchievementTimeRangeType.YEAR
	timeRangeYear: str = None
	timeRangeMonth: str = None
	compareWithPreviousTimeRange: bool = False
	finalScoreIsRatio: bool = False
	indicators: List[AchievementIndicator] = []

	def __setattr__(self, name, value):
		if name == 'indicators':
			super().__setattr__(name, construct_indicators(value))
		else:
			super().__setattr__(name, value)
