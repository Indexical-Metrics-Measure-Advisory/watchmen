from typing import Callable, Dict, List, Optional, Set, Tuple

from watchmen_data_kernel.utils import parse_function_in_variable, parse_variable
from watchmen_lineage.model.lineage import RelationType
from watchmen_model.admin import CopyToMemoryAction, FromFactor, Pipeline, PipelineAction, ReadRowAction, \
	ReadRowsAction, ReadTopicAction, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, FactorId, Parameter, \
	ParameterComputeType, ParameterKind, TopicFactorParameter, TopicId, VariablePredefineFunctions
from watchmen_utilities import ArrayHelper, is_blank

# (topicId, factorId, relationType, arithmetic) of one referenced factor
FactorDependency = Tuple[TopicId, FactorId, RelationType, Optional[str]]
# (topicId, factorId) of one factor referenced by name
FactorReference = Tuple[TopicId, FactorId]
# resolves a topic id to its definition, returns None when the topic is unknown
TopicResolver = Callable[[TopicId], Optional[Topic]]


def split_variable_segments(name: str) -> List[str]:
	"""
	Split variable name into segments by dot, ignoring dots inside parentheses.
	Mirrors watchmen_data_kernel.storage_bridge.utils.split_variable_segments — copied
	here to keep this module free of the meta storage bootstrap dragged in by the
	storage_bridge package import.
	"""
	segments = []
	depth = 0
	segment = ''
	for char in name.strip():
		if char == '.' and depth == 0:
			segments.append(segment)
			segment = ''
		else:
			if char == '(':
				depth = depth + 1
			elif char == ')' and depth > 0:
				depth = depth - 1
			segment = segment + char
	segments.append(segment)
	return segments


def is_number_calculate(source: ComputedParameter) -> bool:
	# mirrors watchmen_lineage.utils.utils.is_number_calculate, kept local for a light import chain
	return source.type == ParameterComputeType.ADD or source.type == ParameterComputeType.MODULUS or \
		source.type == ParameterComputeType.DIVIDE or source.type == ParameterComputeType.MULTIPLY or \
		source.type == ParameterComputeType.SUBTRACT


def is_datetime_compute(source: ComputedParameter) -> bool:
	# mirrors watchmen_lineage.utils.utils.is_datetime_compute, kept local for a light import chain
	return source.type == ParameterComputeType.DAY_OF_MONTH or source.type == ParameterComputeType.DAY_OF_WEEK or \
		source.type == ParameterComputeType.HALF_YEAR_OF or source.type == ParameterComputeType.MONTH_OF or \
		source.type == ParameterComputeType.QUARTER_OF or source.type == ParameterComputeType.WEEK_OF_MONTH or \
		source.type == ParameterComputeType.WEEK_OF_YEAR or source.type == ParameterComputeType.YEAR_OF


class PipelineVariableContext:
	"""
	Variable bindings of one pipeline, replayed from its read actions. Used to resolve
	{variable} references inside constant parameters to concrete topic factors, in the
	same order the pipeline kernel resolves them at runtime: explicit variables first,
	current trigger data as the fallback.
	"""

	def __init__(self, trigger_topic_id: Optional[TopicId]):
		self.trigger_topic_id = trigger_topic_id
		# variableName -> (topicId, factorId), from read-factor/read-factors actions
		self.factor_variables: Dict[str, FactorReference] = {}
		# variableName -> topicId, from read-row/read-rows actions; the value is a row keyed by factor names
		self.row_variables: Dict[str, TopicId] = {}
		# variableName -> copied parameter, from copy-to-memory actions
		self.memory_variables: Dict[str, Parameter] = {}


def build_variable_context(pipeline: Pipeline) -> PipelineVariableContext:
	"""
	Collect variable bindings from all read actions of the pipeline. Actions are scanned
	as a whole rather than per unit, matching the graph builder behavior — a write action
	may reference a variable declared anywhere in the same pipeline.
	"""
	context = PipelineVariableContext(pipeline.topicId)
	for stage in pipeline.stages or []:
		for unit in stage.units or []:
			for action in unit.do or []:
				bind_action_variable(action, context)
	return context


def bind_action_variable(action: PipelineAction, context: PipelineVariableContext) -> None:
	if isinstance(action, ReadTopicAction):
		variable_name = action.variableName
		if is_blank(variable_name):
			return
		if isinstance(action, FromFactor):
			if not is_blank(action.factorId):
				context.factor_variables[variable_name] = (action.topicId, action.factorId)
		elif isinstance(action, (ReadRowAction, ReadRowsAction)):
			context.row_variables[variable_name] = action.topicId
	elif isinstance(action, CopyToMemoryAction):
		if not is_blank(action.variableName):
			context.memory_variables[action.variableName] = action.source


def extract_factor_dependencies(
		source: Optional[Parameter], relation_type: RelationType, arithmetic: Optional[str],
		context: PipelineVariableContext, resolve_topic: TopicResolver, visiting: Optional[Set[str]] = None
) -> List[FactorDependency]:
	"""
	Walk a structured mapping source and return (topicId, factorId, relationType, arithmetic)
	for every topic factor it references. Computed parameters re-tag the relation as Computed
	with the compute operator as arithmetic. Constant values are scanned for {variable}
	references and resolved against the pipeline variable context, falling back to the
	trigger topic — the same resolution order the pipeline kernel uses at runtime.
	Anything that cannot be resolved is skipped instead of raising, so one creative
	constant can never break the whole lineage query.
	"""
	if source is None:
		return []
	if source.kind == ParameterKind.TOPIC:
		source: TopicFactorParameter = source
		return [(source.topicId, source.factorId, relation_type, arithmetic)]
	elif source.kind == ParameterKind.COMPUTED:
		source: ComputedParameter = source
		relation_type = RelationType.Computed
		arithmetic = source.type
		if is_number_calculate(source) or source.type == ParameterComputeType.CASE_THEN:
			nested_parameters = source.parameters or []
		elif is_datetime_compute(source):
			nested = source.parameters or []
			nested_parameters = nested if len(nested) == 1 else []
		else:
			nested_parameters = []
		dependencies: List[FactorDependency] = []
		for nested_parameter in nested_parameters:
			dependencies.extend(extract_factor_dependencies(
				nested_parameter, relation_type, arithmetic, context, resolve_topic, visiting))
		return dependencies
	elif source.kind == ParameterKind.CONSTANT:
		source: ConstantParameter = source
		references = extract_constant_references(source, context, resolve_topic, visiting or set())
		return [(topic_id, factor_id, RelationType.ConstantsReference, arithmetic)
		        for topic_id, factor_id in references]
	else:
		return []


def extract_constant_references(
		parameter: ConstantParameter, context: PipelineVariableContext, resolve_topic: TopicResolver,
		visiting: Set[str]
) -> List[FactorReference]:
	value = parameter.value
	if is_blank(value) or '{' not in value or '}' not in value:
		return []
	try:
		found, variables = parse_variable(value)
	except Exception:
		# not a parsable constant, no references
		return []
	if not found:
		return []
	references: List[FactorReference] = []
	for might in variables:
		if not might.has_variable():
			continue
		references.extend(resolve_variable(might.variable, context, resolve_topic, visiting))
	# one constant may mention the same factor twice
	return ArrayHelper(references).distinct(lambda one, another: one[0] == another[0] and one[1] == another[1]) \
		.to_list()


def resolve_variable(
		name: str, context: PipelineVariableContext, resolve_topic: TopicResolver, visiting: Set[str]
) -> List[FactorReference]:
	name = name.strip()
	if is_blank(name):
		return []
	try:
		if name.startswith('&'):
			return resolve_function_variable(name, context, resolve_topic, visiting)
		else:
			return resolve_plain_variable(name, context, resolve_topic, visiting)
	except Exception:
		# lineage never fails on an unresolvable constant reference
		return []


def resolve_function_variable(
		name: str, context: PipelineVariableContext, resolve_topic: TopicResolver, visiting: Set[str]
) -> List[FactorReference]:
	"""
	Resolve predefine functions embedded in constants, mirroring the runtime dispatch of
	create_run_constant_segment. Function parameters that are variable/factor references
	are resolved; literal parameters simply match no factor and are skipped.
	"""
	fn = VariablePredefineFunctions
	# both parameters are variable/factor references
	if name.startswith(fn.YEAR_DIFF.value):
		return resolve_function_parameters(name, fn.YEAR_DIFF.value, 2, [0, 1], context, resolve_topic, visiting)
	elif name.startswith(fn.MONTH_DIFF.value):
		return resolve_function_parameters(name, fn.MONTH_DIFF.value, 2, [0, 1], context, resolve_topic, visiting)
	elif name.startswith(fn.DAY_DIFF.value):
		return resolve_function_parameters(name, fn.DAY_DIFF.value, 2, [0, 1], context, resolve_topic, visiting)
	elif name.startswith(fn.MOVE_DATE.value):
		# the second parameter is the move pattern, only the first one is a reference
		return resolve_function_parameters(name, fn.MOVE_DATE.value, 2, [0], context, resolve_topic, visiting)
	elif name.startswith(fn.DATE_FORMAT.value):
		# the second parameter is the date format, only the first one is a reference
		return resolve_function_parameters(name, fn.DATE_FORMAT.value, 2, [0], context, resolve_topic, visiting)
	elif name.startswith(fn.COMBINE_DATETIME.value):
		return resolve_function_parameters(name, fn.COMBINE_DATETIME.value, 2, [0, 1], context, resolve_topic, visiting)
	elif name.startswith(fn.FROM_PREVIOUS_TRIGGER_DATA.value):
		# &old.factorName reads the previous value of a trigger topic factor
		rest = name[len(fn.FROM_PREVIOUS_TRIGGER_DATA.value):]
		if rest.startswith('.'):
			return find_factor_on_topic(context.trigger_topic_id, rest[1:], resolve_topic)
		else:
			return []
	else:
		# &now, &nextSeq and anything else carry no factor reference
		return []


def resolve_function_parameters(
		literal: str, function_name: str, parameters_count: int, reference_positions: List[int],
		context: PipelineVariableContext, resolve_topic: TopicResolver, visiting: Set[str]
) -> List[FactorReference]:
	try:
		parameters = parse_function_in_variable(literal, function_name, parameters_count)
	except Exception:
		# not a well-formed function call, no references
		return []
	references: List[FactorReference] = []
	for position in reference_positions:
		references.extend(resolve_variable(parameters[position], context, resolve_topic, visiting))
	return references


def resolve_plain_variable(
		name: str, context: PipelineVariableContext, resolve_topic: TopicResolver, visiting: Set[str]
) -> List[FactorReference]:
	segments = split_variable_segments(name)
	if len(segments) == 0:
		return []
	first = segments[0].strip()
	if is_blank(first):
		return []
	if first in context.factor_variables:
		# the variable holds a factor value; trailing segments only shape that value
		return [context.factor_variables[first]]
	elif first in context.row_variables:
		# the variable holds a row; remaining segments spell the factor name,
		# &count-like function segments are value shaping and do not count
		factor_name = '.'.join([segment for segment in segments[1:] if not segment.startswith('&')])
		if is_blank(factor_name):
			# the whole row is referenced, no single factor can be attributed
			return []
		return find_factor_on_topic(context.row_variables[first], factor_name, resolve_topic)
	elif first in context.memory_variables:
		if first in visiting:
			return []
		visiting.add(first)
		parameter = context.memory_variables[first]
		dependencies = extract_factor_dependencies(
			parameter, RelationType.ConstantsReference, None, context, resolve_topic, visiting)
		return [(topic_id, factor_id) for topic_id, factor_id, _, _ in dependencies]
	else:
		# no explicit variable: fall back to current trigger data, which is keyed by factor names.
		# factor names may contain dots, so try the full name first, then the first segment
		references = find_factor_on_topic(context.trigger_topic_id, name, resolve_topic)
		if len(references) == 0:
			references = find_factor_on_topic(context.trigger_topic_id, first, resolve_topic)
		return references


def find_factor_on_topic(
		topic_id: Optional[TopicId], factor_name: Optional[str], resolve_topic: TopicResolver
) -> List[FactorReference]:
	if is_blank(topic_id) or is_blank(factor_name):
		return []
	topic = resolve_topic(topic_id)
	if topic is None:
		return []
	factor = ArrayHelper(topic.factors or []).find(lambda x: x.name == factor_name)
	if factor is None:
		return []
	return [(topic_id, factor.factorId)]
