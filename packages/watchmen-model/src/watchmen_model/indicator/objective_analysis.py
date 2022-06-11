from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import AchievementId, Auditable, DataModel, InspectionId, LastVisit, ObjectiveAnalysisId, \
	UserBasedTuple


class ObjectiveAnalysisPerspectiveType(str, Enum):
	INSPECTION = 'inspection',
	ACHIEVEMENT = 'achievement'


class ObjectiveAnalysisPerspective(DataModel, BaseModel):
	perspectiveId: str = None
	description: Optional[str] = None
	type: ObjectiveAnalysisPerspectiveType = ObjectiveAnalysisPerspectiveType.INSPECTION
	relationId: Optional[Union[InspectionId, AchievementId]] = None


class ObjectiveAnalysis(UserBasedTuple, Auditable, LastVisit, BaseModel):
	analysisId: ObjectiveAnalysisId = None
	title: str = None
	description: str = None
	perspectives: List[ObjectiveAnalysisPerspective] = []
