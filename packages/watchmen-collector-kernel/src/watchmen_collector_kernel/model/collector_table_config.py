from typing import Dict, List, Optional, Union
from .condition import Condition, construct_conditions, construct_condition
from watchmen_model.common import TenantBasedTuple, Storable, OptimisticLock
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class JoinCondition(Storable, ExtendedBaseModel):
	parentKey: Optional[Condition] = None
	childKey: Optional[Condition] = None

	def __setattr__(self, name, value):
		if name == 'parentKey':
			super().__setattr__(name, construct_condition(value))
		elif name == 'childKey':
			super().__setattr__(name, construct_condition(value))


class Dependence(Storable, ExtendedBaseModel):
	modelName: Optional[str] = None
	objectKey: Optional[str] = None  # the dependent column


class JsonColumn(Storable, ExtendedBaseModel):
	columnName: Optional[str] = None
	ignoredPath: Optional[List[str]] = None
	needFlatten: Optional[bool] = None
	flattenPath: Optional[List[str]] = None
	jsonPath: Optional[List[str]] = None


def construct_json_column(json_column: Union[JsonColumn, Dict]) -> Optional[JsonColumn]:
	if json_column is None:
		return None
	elif isinstance(json_column, JsonColumn):
		return json_column
	else:
		return JsonColumn(**json_column)


def construct_json_columns(json_columns: Optional[List[Union[JsonColumn, Dict]]]) -> Optional[List[JsonColumn]]:
	if json_columns is None:
		return None
	else:
		return ArrayHelper(json_columns).map(lambda x: construct_json_column(x)).to_list()


def construct_join_condition(join_condition: Optional[Union[JoinCondition, Dict]]) -> Optional[JoinCondition]:
	if join_condition is None:
		return None
	else:
		return JoinCondition(**join_condition)


def construct_join_conditions(join_conditions: Optional[List[Union[JoinCondition, Dict]]]) -> Optional[List[JoinCondition]]:
	if join_conditions is None:
		return None
	else:
		return ArrayHelper(join_conditions).map(lambda x: construct_join_condition(x)).to_list()


def construct_dependence(dependence: Union[Dependence, Dict]) -> Optional[Dependence]:
	if dependence is None:
		return None
	elif isinstance(dependence, Dependence):
		return dependence
	else:
		return Dependence(**dependence)


def construct_depend_on(depend_on: Optional[List[Union[Dependence, Dict]]]) -> Optional[List[Dependence]]:
	if depend_on is None:
		return None
	else:
		return ArrayHelper(depend_on).map(lambda x: construct_dependence(x)).to_list()


class CollectorTableConfig(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
	configId: Optional[str] = None
	name: Optional[str] = None
	tableName: Optional[str] = None
	primaryKey: Optional[List[str]] = None
	objectKey: Optional[str] = None
	sequenceKey: Optional[str] = None
	modelName: Optional[str] = None
	parentName: Optional[str] = None
	label: Optional[str] = None
	joinKeys: Optional[List[JoinCondition]] = None
	dependOn: Optional[List[Dependence]] = []
	auditColumn: Optional[str] = None
	ignoredColumns: Optional[List[str]] = None
	jsonColumns: Optional[List[JsonColumn]] = None
	conditions: Optional[List[Condition]] = []
	dataSourceId: Optional[str] = None
	isList: bool = False
	triggered: bool = False

	def __setattr__(self, name, value):
		if name == 'joinKeys':
			super().__setattr__(name, construct_join_conditions(value))
		elif name == 'dependOn':
			super().__setattr__(name, construct_depend_on(value))
		elif name == 'conditions':
			super().__setattr__(name, construct_conditions(value))
		elif name == 'jsonColumns':
			super().__setattr__(name, construct_json_columns(value))
		else:
			super().__setattr__(name, value)
