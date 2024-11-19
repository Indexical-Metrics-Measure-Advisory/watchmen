from typing import Dict, List, Optional, Union

from _decimal import Decimal

from watchmen_model.common import Auditable, LastVisit, UserBasedTuple
from watchmen_model.common.tuple_ids import ObjectiveReportId
from watchmen_model.indicator import ObjectiveTarget, ObjectiveTimeFrame, ObjectiveVariable, ObjectiveVariableKind, \
	ObjectiveVariableOnBucket, ObjectiveVariableOnRange, ObjectiveVariableOnValue
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class Variable(ExtendedBaseModel):
	name: Optional[str] = None
	value: Optional[str] = None


class CellValue(ExtendedBaseModel):
	currentValue: Optional[Decimal] = None
	previousValue: Optional[Decimal] = None
	chainValue: Decimal = None
	failed: bool = False


class CellTarget(ExtendedBaseModel):
	name: str = None
	row: str = None
	cell: str = None
	objectiveId: str = None
	value: CellValue = CellValue()
	targetId: str = None
	parameters: Dict = None


def construct_cells(cells: Optional[list] = None) -> Optional[List[CellTarget]]:
	if cells is None:
		return None
	else:
		return ArrayHelper(cells).map(lambda x: construct_cell(x)).to_list()


def construct_target(target: Optional[Union[dict, ObjectiveTarget]]) -> Optional[ObjectiveTarget]:
	if target is None:
		return None
	elif isinstance(target, ObjectiveTarget):
		return target
	else:
		# noinspection PyArgumentList
		return ObjectiveTarget(**target)


def construct_cell(cell: Optional[dict] = None) -> Optional[CellTarget]:
	if cell is None:
		return None
	else:
		return CellTarget(**cell)


def construct_targets(targets: Optional[list] = None) -> Optional[List[ObjectiveTarget]]:
	if targets is None:
		return None
	else:
		return ArrayHelper(targets).map(lambda x: construct_target(x)).to_list()


def construct_variable(variable: Optional[Union[dict, ObjectiveVariable]]) -> Optional[ObjectiveVariable]:
	if variable is None:
		return None
	elif isinstance(variable, ObjectiveVariable):
		return variable
	else:
		kind = variable.get('kind')
		if kind == ObjectiveVariableKind.SINGLE_VALUE:
			return ObjectiveVariableOnValue(**variable)
		elif kind == ObjectiveVariableKind.RANGE:
			return ObjectiveVariableOnRange(**variable)
		elif kind == ObjectiveVariableKind.BUCKET:
			return ObjectiveVariableOnBucket(**variable)
		else:
			raise Exception(f'Objective variable kind[{kind}] cannot be recognized.')


def construct_variables(variables: Optional[list] = None) -> Optional[List[ObjectiveVariable]]:
	if variables is None:
		return None
	else:
		return ArrayHelper(variables).map(lambda x: construct_variable(x)).to_list()


class ObjectiveReport(ExtendedBaseModel,UserBasedTuple, Auditable, LastVisit ):
	objectiveReportId: ObjectiveReportId = None
	name: str = None
	variables: List[ObjectiveVariable] = []
	timeFrame: ObjectiveTimeFrame = []
	cells: List[CellTarget] = []

	def __setattr__(self, name, value):
		if name == 'cells':
			super().__setattr__(name, construct_cells(value))
		elif name == 'targets':
			super().__setattr__(name, construct_targets(value))
		elif name == 'variables':
			super().__setattr__(name, construct_variables(value))
		else:
			super().__setattr__(name, value)
