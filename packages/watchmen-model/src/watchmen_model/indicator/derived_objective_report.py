from typing import Optional, Union

from pydantic import BaseModel

from watchmen_model.common import UserBasedTuple, Auditable, LastVisit
from watchmen_model.common.tuple_ids import ObjectiveReportId, DerivedObjectiveReportId
from watchmen_model.indicator.objective_report import ObjectiveReport


def construct_objective_report(definition: Optional[Union[dict, ObjectiveReport]]) -> Optional[ObjectiveReport]:
	if definition is None:
		return None
	elif isinstance(definition, ObjectiveReport):
		return definition
	else:
		# noinspection PyArgumentList
		return ObjectiveReport(**definition)

class DerivedObjectiveReport(UserBasedTuple, Auditable, LastVisit, BaseModel):
	derivedObjectiveReportId: DerivedObjectiveReportId = None
	name: str = None
	description: str = None
	objectiveReportId: ObjectiveReportId
	definition: ObjectiveReport

	def __setattr__(self, name, value):
		if name == 'definition':
			super().__setattr__(name, construct_objective_report(value))
		else:
			super().__setattr__(name, value)