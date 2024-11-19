from datetime import datetime
from enum import Enum
from typing import List, Dict, Optional, Union

from .condition import Condition, construct_conditions
from watchmen_model.common import TenantBasedTuple, DataModel
from watchmen_utilities import ExtendedBaseModel, ArrayHelper


class EventType(int, Enum):
	DEFAULT = 1,
	BY_TABLE = 2,
	BY_RECORD = 3,
	BY_PIPELINE = 4


class QueryParam(DataModel, ExtendedBaseModel):
	name: str
	filter: List[Condition]

	def __setattr__(self, name, value):
		if name == 'filter':
			super().__setattr__(name, construct_conditions(value))
		else:
			super().__setattr__(name, value)


class TriggerEvent(TenantBasedTuple, ExtendedBaseModel):
	eventTriggerId: Optional[int] = None
	startTime: Optional[datetime] = None
	endTime: Optional[datetime] = None
	isFinished: bool = False
	status: Optional[int] = None
	type: Optional[int] = None
	tableName: Optional[str] = None
	records: Optional[List[Dict]] = []
	pipelineId: Optional[str] = None
	params: Optional[List[QueryParam]] = None

	def __setattr__(self, name, value):
		if name == 'params':
			super().__setattr__(name, construct_params(value))
		else:
			super().__setattr__(name, value)


def construct_params(params: Optional[List[Union[dict, QueryParam]]]) -> Optional[List[QueryParam]]:
	if params is None:
		return None
	else:
		return ArrayHelper(params).map(lambda x: construct_param(x)).to_list()


def construct_param(param: Optional[Union[dict, QueryParam]]) -> Optional[QueryParam]:
	if param is None:
		return None
	elif isinstance(param, QueryParam):
		return param
	else:
		return QueryParam(**param)
