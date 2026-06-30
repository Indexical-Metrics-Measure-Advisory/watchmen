from enum import Enum
from typing import List, Optional, Union, Dict, Any

from watchmen_utilities import ArrayHelper, ExtendedBaseModel
from watchmen_model.common import TenantBasedTuple, OptimisticLock, TopicId, DataSourceId
from ..common.tuple_ids import OntologyId


class OntologySensitivity(str, Enum):
	PUBLIC = 'public'
	INTERNAL = 'internal'
	CONFIDENTIAL = 'confidential'
	RESTRICTED = 'restricted'


class JoinCondition(ExtendedBaseModel):
	sourceField: Optional[str] = None
	targetField: Optional[str] = None


class FilterCondition(ExtendedBaseModel):
	# 物理字段名，例如 policy_status_code
	field: Optional[str] = None
	# 比较操作符：eq / ne / in / not_in / gt / gte / lt / lte / is_null / is_not_null
	operator: Optional[str] = 'eq'
	# 常量值；单值操作符为标量，列表操作符为列表，空操作符(is_null/is_not_null)忽略
	value: Optional[Union[str, int, float, bool, List[Any]]] = None


class PhysicalTableMapping(ExtendedBaseModel):
	topicId: Optional[TopicId] = None
	topicName: Optional[str] = None
	alias: Optional[str] = None
	# 业务职能：primary / detail / profile / metric / tag / lookup
	kind: Optional[str] = 'detail'
	# JOIN 行为：inner / left / right / full；空则按 kind 推导默认值
	joinType: Optional[str] = None
	fields: Optional[List[str]] = []
	joinConditions: Optional[List[JoinCondition]] = []
	# 行级过滤（key-in 常量），例如 policy_status_code eq "issued"
	filters: Optional[List[FilterCondition]] = []

	def __setattr__(self, name, value):
		if name == 'joinConditions':
			super().__setattr__(name, PhysicalTableMapping._construct_join_conditions(value))
		elif name == 'filters':
			super().__setattr__(name, PhysicalTableMapping._construct_filters(value))
		else:
			super().__setattr__(name, value)

	@staticmethod
	def _construct_join_conditions(values):
		if values is None:
			return []
		return ArrayHelper(values).map(
			lambda x: x if isinstance(x, JoinCondition) else JoinCondition(**x)
		).to_list()

	@staticmethod
	def _construct_filters(values):
		if values is None:
			return []
		return ArrayHelper(values).map(
			lambda x: x if isinstance(x, FilterCondition) else FilterCondition(**x)
		).to_list()


class VirtualObjectAttribute(ExtendedBaseModel):
	name: Optional[str] = None
	sourceTable: Optional[str] = None
	sourceField: Optional[str] = None


class DerivedAttribute(ExtendedBaseModel):
	id: Optional[str] = None
	name: Optional[str] = None
	description: Optional[str] = None
	objectId: Optional[str] = None
	aggregate: Optional[str] = 'count'
	path: Optional[List[str]] = []
	targetField: Optional[str] = None


class VirtualObject(ExtendedBaseModel):
	id: Optional[str] = None
	name: Optional[str] = None
	description: Optional[str] = None
	# 指向业务数据源（watchmen_model.system.DataSource）。
	# 为空时查询将返回空数据（仅 compile-preview 可用）。
	datasourceId: Optional[DataSourceId] = None
	physicalTables: Optional[List[PhysicalTableMapping]] = []
	attributes: Optional[List[VirtualObjectAttribute]] = []
	derivedAttributes: Optional[List[DerivedAttribute]] = []
	icon: Optional[str] = None
	color: Optional[str] = None

	def __setattr__(self, name, value):
		if name == 'physicalTables':
			super().__setattr__(name, VirtualObject._construct_physical_tables(value))
		elif name == 'attributes':
			super().__setattr__(name, VirtualObject._construct_attributes(value))
		elif name == 'derivedAttributes':
			super().__setattr__(name, VirtualObject._construct_derived_attributes(value))
		else:
			super().__setattr__(name, value)

	@staticmethod
	def _construct_physical_tables(values):
		if values is None:
			return []
		return ArrayHelper(values).map(
			lambda x: x if isinstance(x, PhysicalTableMapping) else PhysicalTableMapping(**x)
		).to_list()

	@staticmethod
	def _construct_attributes(values):
		if values is None:
			return []
		return ArrayHelper(values).map(
			lambda x: x if isinstance(x, VirtualObjectAttribute) else VirtualObjectAttribute(**x)
		).to_list()

	@staticmethod
	def _construct_derived_attributes(values):
		if values is None:
			return []
		return ArrayHelper(values).map(
			lambda x: x if isinstance(x, DerivedAttribute) else DerivedAttribute(**x)
		).to_list()


class VirtualLink(ExtendedBaseModel):
	id: Optional[str] = None
	name: Optional[str] = None
	sourceObjectId: Optional[str] = None
	targetObjectId: Optional[str] = None
	joinType: Optional[str] = 'inner'
	joinConditions: Optional[List[JoinCondition]] = []
	description: Optional[str] = None

	def __setattr__(self, name, value):
		if name == 'joinConditions':
			super().__setattr__(name, VirtualLink._construct_join_conditions(value))
		else:
			super().__setattr__(name, value)

	@staticmethod
	def _construct_join_conditions(values):
		if values is None:
			return []
		return ArrayHelper(values).map(
			lambda x: x if isinstance(x, JoinCondition) else JoinCondition(**x)
		).to_list()


class VirtualOntology(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	ontologyId: Optional[OntologyId] = None
	name: Optional[str] = None
	description: Optional[str] = None
	owner: Optional[str] = None
	technicalOwner: Optional[str] = None
	tags: Optional[List[str]] = []
	sensitivity: Optional[OntologySensitivity] = OntologySensitivity.INTERNAL
	# dataSourceId 已下放到 VirtualObject.datasourceId。
	virtualObjects: Optional[List[VirtualObject]] = []
	virtualLinks: Optional[List[VirtualLink]] = []

	def __setattr__(self, name, value):
		if name == 'sensitivity':
			super().__setattr__(name, VirtualOntology._construct_sensitivity(value))
		elif name == 'virtualObjects':
			super().__setattr__(name, VirtualOntology._construct_virtual_objects(value))
		elif name == 'virtualLinks':
			super().__setattr__(name, VirtualOntology._construct_virtual_links(value))
		else:
			super().__setattr__(name, value)

	@staticmethod
	def _construct_sensitivity(value):
		if value is None:
			return OntologySensitivity.INTERNAL
		elif isinstance(value, OntologySensitivity):
			return value
		else:
			return OntologySensitivity(value)

	@staticmethod
	def _construct_virtual_objects(values):
		if values is None:
			return []
		return ArrayHelper(values).map(
			lambda x: x if isinstance(x, VirtualObject) else VirtualObject(**x)
		).to_list()

	@staticmethod
	def _construct_virtual_links(values):
		if values is None:
			return []
		return ArrayHelper(values).map(
			lambda x: x if isinstance(x, VirtualLink) else VirtualLink(**x)
		).to_list()
