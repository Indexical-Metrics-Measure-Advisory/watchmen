from typing import Optional, Union

from pydantic import BaseModel

from watchmen_model.common import Auditable, DerivedObjectiveId, LastVisit, ObjectiveId, UserBasedTuple
from .objective import Objective


def construct_objective(definition: Optional[Union[dict, Objective]]) -> Optional[Objective]:
	if definition is None:
		return None
	elif isinstance(definition, Objective):
		return definition
	else:
		# noinspection PyArgumentList
		return Objective(**definition)


class DerivedObjective(UserBasedTuple, Auditable, LastVisit, BaseModel):
	derivedObjectiveId: DerivedObjectiveId = None
	name: str = None
	description: str = None
	objectiveId: ObjectiveId
	definition: Objective

	def __setattr__(self, name, value):
		if name == 'definition':
			super().__setattr__(name, construct_objective(value))
		else:
			super().__setattr__(name, value)
