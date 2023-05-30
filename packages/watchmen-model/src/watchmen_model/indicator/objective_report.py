from typing import List, Dict

from pydantic import BaseModel

from watchmen_model.common import UserBasedTuple, Auditable, LastVisit




class Variable(BaseModel):
	name: str = None
	value: str = None

class CellTargetValue(BaseModel):
	name: str = None
	row: str = None
	cell: str = None
	objectiveId: str = None
	targetId: str = None
	parameters: Dict = None

class ObjectiveReport(UserBasedTuple, Auditable, LastVisit, BaseModel):
	name: str = None
	variables: List[Variable] = []
	timeFrames: List[Variable] = []
	cells: List[CellTargetValue] = []


