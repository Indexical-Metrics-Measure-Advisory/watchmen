"""Space scope of a virtual ontology.

Single home for every ontology <-> space interaction:
- resolve the linked space of an ontology (fail-closed when configured but missing);
- list spaces / space topics for the editor;
- validate that an ontology's physical tables stay within the linked space (on save);
- convert enabled space filters (row-level ParameterJoint per topic) into the
  ontology engine's FilterCondition shape and inject them into query compilation.

Services built here always share the storage/transaction of the given primary
service (ask_meta_storage() creates a fresh storage instance per call, whose
connection would otherwise stay None inside the outer transaction).
"""

from typing import Any, Callable, Dict, List, Optional

from watchmen_meta.admin import SpaceService, TopicService
from watchmen_meta.common import TupleService
from watchmen_model.admin import FilterCondition, Space, Topic, VirtualOntology
from watchmen_model.common import (
	ConstantParameter, ParameterCondition, ParameterExpression, ParameterExpressionOperator,
	ParameterJoint, ParameterJointType, TopicFactorParameter, TopicId
)
from watchmen_rest.util import raise_400, raise_404
from watchmen_utilities import is_blank, is_not_blank


# ParameterExpressionOperator -> FilterCondition operator
_OPERATOR_MAPPING: Dict[ParameterExpressionOperator, str] = {
	ParameterExpressionOperator.EQUALS: 'eq',
	ParameterExpressionOperator.NOT_EQUALS: 'ne',
	ParameterExpressionOperator.LESS: 'lt',
	ParameterExpressionOperator.LESS_EQUALS: 'lte',
	ParameterExpressionOperator.MORE: 'gt',
	ParameterExpressionOperator.MORE_EQUALS: 'gte',
	ParameterExpressionOperator.IN: 'in',
	ParameterExpressionOperator.NOT_IN: 'not-in',
	ParameterExpressionOperator.EMPTY: 'is_null',
	ParameterExpressionOperator.NOT_EMPTY: 'is_not_null',
}


def _expression_to_filter_condition(
	expression: ParameterExpression, factor_names: Dict[str, str], context_label: str
) -> FilterCondition:
	"""Convert one ParameterExpression (topic factor vs constant) into a FilterCondition."""
	left = expression.left
	if not isinstance(left, TopicFactorParameter) or is_blank(left.factorId):
		raise_400(
			f'Space filter [{context_label}]: left side must be a topic factor, '
			f'got [{type(left).__name__}].')
	factor_name = factor_names.get(str(left.factorId))
	if factor_name is None:
		raise_400(
			f'Space filter [{context_label}]: factor [{left.factorId}] not found on the filter topic.')

	operator = _OPERATOR_MAPPING.get(expression.operator)
	if operator is None:
		raise_400(f'Space filter [{context_label}]: unsupported operator [{expression.operator}].')

	if operator in ('is_null', 'is_not_null'):
		return FilterCondition(field=factor_name, operator=operator)

	right = expression.right
	if not isinstance(right, ConstantParameter):
		raise_400(
			f'Space filter [{context_label}]: right side must be a constant, '
			f'got [{type(right).__name__}].')
	raw_value = right.value
	if raw_value is None:
		raise_400(f'Space filter [{context_label}]: constant value is required.')
	raw_value = raw_value.strip()
	if '{' in raw_value or '}' in raw_value:
		raise_400(
			f'Space filter [{context_label}]: variables in constant [{raw_value}] are not supported.')

	if operator in ('in', 'not-in'):
		values = [item.strip() for item in raw_value.split(',') if is_not_blank(item.strip())]
		if len(values) == 0:
			raise_400(f'Space filter [{context_label}]: operator [{operator}] requires a non-empty list value.')
		return FilterCondition(field=factor_name, operator=operator, value=values)
	return FilterCondition(field=factor_name, operator=operator, value=raw_value)


def joint_to_filter_conditions(
	joint: Optional[ParameterJoint], factor_names: Dict[str, str], context_label: str
) -> List[FilterCondition]:
	"""Convert a space-filter joint tree into a flat FilterCondition list (AND semantics).

	Only the safe subset is supported: AND joints (nested AND is flattened), conditions
	of form <topic factor> <operator> <constant>. OR joints and non-constant right sides
	are rejected explicitly instead of being silently dropped, since these filters carry
	data-permission semantics.
	"""
	if joint is None:
		return []
	if joint.jointType == ParameterJointType.OR:
		raise_400(f'Space filter [{context_label}]: OR joints are not supported.')

	conditions: List[FilterCondition] = []

	def walk(condition: Optional[ParameterCondition]) -> None:
		if condition is None:
			return
		if isinstance(condition, ParameterJoint):
			if condition.jointType == ParameterJointType.OR:
				raise_400(f'Space filter [{context_label}]: OR joints are not supported.')
			for sub in (condition.filters or []):
				walk(sub)
		elif isinstance(condition, ParameterExpression):
			conditions.append(_expression_to_filter_condition(condition, factor_names, context_label))
		else:
			raise_400(
				f'Space filter [{context_label}]: unsupported condition [{type(condition).__name__}].')

	for sub in (joint.filters or []):
		walk(sub)
	return conditions


def build_filter_conditions_by_topic(
	space: Space, topic_lookup: Callable[[TopicId], Optional[Topic]]
) -> Dict[str, List[FilterCondition]]:
	"""Convert all enabled space filters, grouped by str(topicId). Pure and unit-testable."""
	conditions_by_topic: Dict[str, List[FilterCondition]] = {}
	for space_filter in (space.filters or []):
		if not space_filter.enabled or is_blank(space_filter.topicId) or space_filter.joint is None:
			continue
		topic_id = str(space_filter.topicId)
		topic = topic_lookup(space_filter.topicId)
		if topic is None:
			raise_400(f'Space filter on topic [{topic_id}]: topic not found.')
		factor_names = {
			str(factor.factorId): factor.name
			for factor in (topic.factors or [])
			if factor.factorId is not None and is_not_blank(factor.name)
		}
		conditions = joint_to_filter_conditions(space_filter.joint, factor_names, f'space [{space.name}]')
		if len(conditions) > 0:
			conditions_by_topic.setdefault(topic_id, []).extend(conditions)
	return conditions_by_topic


class OntologySpaceScope:
	"""Space-related operations for an ontology, sharing the primary service's storage."""

	def __init__(self, primary_service: TupleService) -> None:
		self.principal_service = primary_service.principalService
		self.space_service = SpaceService(
			primary_service.storage, primary_service.snowflakeGenerator, primary_service.principalService)
		self.topic_service = TopicService(
			primary_service.storage, primary_service.snowflakeGenerator, primary_service.principalService)

	def find_linked_space(self, ontology: VirtualOntology) -> Optional[Space]:
		"""Load the linked space. Fail-closed: an ontology configured with a space id
		whose space is missing or belongs to another tenant is an error, not a pass."""
		if is_blank(ontology.spaceId):
			return None
		space = self.space_service.find_by_id(ontology.spaceId)
		if space is None or space.tenantId != self.principal_service.get_tenant_id():
			raise_400(f'Space [{ontology.spaceId}] not found.')
		return space

	def find_linked_space_name(self, ontology: VirtualOntology) -> Optional[str]:
		"""Lenient variant for YAML export: None when unset or unresolvable."""
		if is_blank(ontology.spaceId):
			return None
		space = self.space_service.find_by_id(ontology.spaceId)
		return space.name if space is not None else None

	def resolve_space_id_by_name(self, space_name: Optional[str]) -> Optional[str]:
		"""Lenient name -> id resolution for YAML import: exact name match within the
		current tenant; None when blank or not found."""
		if is_blank(space_name):
			return None
		candidates = self.space_service.find_by_name(space_name, self.principal_service.get_tenant_id())
		matched = next((space for space in candidates if space.name == space_name), None)
		return matched.spaceId if matched is not None else None

	def list_available_spaces(self) -> List[Dict[str, Any]]:
		spaces = self.space_service.find_all(self.principal_service.get_tenant_id())
		return [{
			'spaceId': space.spaceId,
			'name': space.name,
			'description': space.description,
			'topicIds': space.topicIds or [],
		} for space in spaces]

	def find_scope_topics(self, space_id: Optional[str]) -> List[Topic]:
		"""Topics selectable for physical tables: space topics when a space is given,
		otherwise all topics of the current tenant."""
		tenant_id = self.principal_service.get_tenant_id()
		if is_blank(space_id):
			return self.topic_service.find_all(tenant_id)
		space = self.space_service.find_by_id(space_id)
		if space is None or space.tenantId != tenant_id:
			raise_404(f'Space [{space_id}] not found.')
		return self.topic_service.find_by_ids(space.topicIds or [], tenant_id)

	def validate_within_space(self, ontology: VirtualOntology) -> None:
		"""On save: the linked space must exist in the current tenant and every physical
		table topic must be within the space's topic scope."""
		if is_blank(ontology.spaceId):
			return
		space = self.find_linked_space(ontology)
		# normalize to str for comparison, in case id types differ
		allowed_topic_ids = {str(topic_id) for topic_id in (space.topicIds or [])}
		invalid = []
		seen = set()
		for vo in (ontology.virtualObjects or []):
			for pt in (vo.physicalTables or []):
				if is_blank(pt.topicId):
					continue
				topic_id = str(pt.topicId)
				if topic_id not in allowed_topic_ids and (vo.name, topic_id) not in seen:
					seen.add((vo.name, topic_id))
					invalid.append(f'object [{vo.name}] topic [{topic_id}] ({pt.topicName})')
		if len(invalid) > 0:
			raise_400(f'Topics out of scope of space [{space.name}]: ' + '; '.join(invalid) + '.')

	def apply_space_filters(self, ontology: VirtualOntology) -> None:
		"""Inject enabled space filters into the matching physical table mappings (in place).

		Called on the query path after the ontology is loaded; the ontology instance is
		request-scoped, so appending to mapping.filters is safe. Mappings are matched by
		str(topicId); an ontology without a linked space is left untouched.
		"""
		space = self.find_linked_space(ontology)
		if space is None:
			return
		conditions_by_topic = build_filter_conditions_by_topic(
			space, lambda topic_id: self.topic_service.find_by_id(topic_id))
		if len(conditions_by_topic) == 0:
			return
		for vo in (ontology.virtualObjects or []):
			for mapping in (vo.physicalTables or []):
				if is_blank(mapping.topicId):
					continue
				conditions = conditions_by_topic.get(str(mapping.topicId))
				if conditions:
					mapping.filters = [*(mapping.filters or []), *conditions]
