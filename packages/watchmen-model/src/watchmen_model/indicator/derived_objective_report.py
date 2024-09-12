from typing import Optional, Union

from watchmen_model.common import UserBasedTuple, Auditable, LastVisit
from watchmen_model.common.tuple_ids import ObjectiveReportId, DerivedObjectiveReportId
from watchmen_model.indicator.objective_report import ObjectiveReport
from watchmen_utilities import ExtendedBaseModel


def construct_objective_report(definition: Optional[Union[dict, ObjectiveReport]]) -> Optional[ObjectiveReport]:
	if definition is None:
		return None
	elif isinstance(definition, ObjectiveReport):
		return definition
	else:
		# noinspection PyArgumentList
		return ObjectiveReport(**definition)


class DerivedObjectiveReport(ExtendedBaseModel, UserBasedTuple, Auditable, LastVisit):
	derivedObjectiveReportId: Optional[DerivedObjectiveReportId] = None
	name: Optional[str] = None
	description: Optional[str] = None
	objectiveReportId: Optional[ObjectiveReportId] = None
	definition: Optional[ObjectiveReport] = None

	def __setattr__(self, name, value):
		if name == 'definition':
			super().__setattr__(name, construct_objective_report(value))
		else:
			super().__setattr__(name, value)