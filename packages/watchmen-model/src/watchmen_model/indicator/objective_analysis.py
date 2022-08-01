from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import AchievementId, DataModel, InspectionId, ObjectiveAnalysisId, OptimisticLock, \
	TenantBasedTuple
from watchmen_utilities import ArrayHelper


class ObjectiveAnalysisPerspectiveType(str, Enum):
	INSPECTION = 'inspection',
	ACHIEVEMENT = 'achievement'


class ObjectiveAnalysisPerspective(DataModel, BaseModel):
	perspectiveId: str = None
	description: Optional[str] = None
	type: ObjectiveAnalysisPerspectiveType = ObjectiveAnalysisPerspectiveType.INSPECTION
	relationId: Optional[Union[InspectionId, AchievementId]] = None


def construct_perspective(
		perspective: Optional[Union[dict, ObjectiveAnalysisPerspective]]
) -> Optional[ObjectiveAnalysisPerspective]:
	if perspective is None:
		return None
	elif isinstance(perspective, ObjectiveAnalysisPerspective):
		return perspective
	else:
		return ObjectiveAnalysisPerspective(**perspective)


def construct_perspectives(indicators: Optional[list] = None) -> Optional[List[ObjectiveAnalysisPerspective]]:
	if indicators is None:
		return None
	else:
		return ArrayHelper(indicators).map(lambda x: construct_perspective(x)).to_list()


class ObjectiveAnalysis(TenantBasedTuple, OptimisticLock, BaseModel):
	analysisId: ObjectiveAnalysisId = None
	title: str = None
	description: str = None
	perspectives: List[ObjectiveAnalysisPerspective] = []

	def __setattr__(self, name, value):
		if name == 'perspectives':
			super().__setattr__(name, construct_perspectives(value))
		else:
			super().__setattr__(name, value)
