import unittest

from watchmen_lineage.model.lineage import RelationType
from watchmen_lineage.service.constant_dependencies import build_variable_context, extract_factor_dependencies
from watchmen_model.admin import CopyToMemoryAction, Factor, Pipeline, PipelineStage, PipelineUnit, ReadFactorAction, \
	ReadRowAction, Topic
from watchmen_model.common import ComputedParameter, ConstantParameter, ParameterComputeType, TopicFactorParameter

TRIGGER_TOPIC_ID = 't-trigger'
READ_TOPIC_ID = 't-read'
ROW_TOPIC_ID = 't-row'

TOPICS = {
	TRIGGER_TOPIC_ID: Topic(topicId=TRIGGER_TOPIC_ID, name='trigger', factors=[
		Factor(factorId='f-order-no', name='order_no'),
		Factor(factorId='f-status', name='status'),
		Factor(factorId='f-customer-city', name='customer.city')
	]),
	READ_TOPIC_ID: Topic(topicId=READ_TOPIC_ID, name='read', factors=[
		Factor(factorId='f-score', name='score'),
		Factor(factorId='f-level', name='level')
	]),
	ROW_TOPIC_ID: Topic(topicId=ROW_TOPIC_ID, name='row', factors=[
		Factor(factorId='f-amount', name='amount')
	])
}


def resolve_topic(topic_id):
	return TOPICS.get(topic_id)


def build_pipeline(actions, trigger_topic_id=TRIGGER_TOPIC_ID):
	unit = PipelineUnit(do=actions)
	stage = PipelineStage(units=[unit])
	return Pipeline(pipelineId='p-1', topicId=trigger_topic_id, stages=[stage], enabled=True)


def build_context(actions, trigger_topic_id=TRIGGER_TOPIC_ID):
	return build_variable_context(build_pipeline(actions, trigger_topic_id))


def extract(source):
	return extract_factor_dependencies(source, RelationType.Direct, None, build_context([]), resolve_topic)


class TestConstantParameterDependencies(unittest.TestCase):
	def test_plain_constant_without_braces(self):
		self.assertEqual(extract(ConstantParameter(value='plain text')), [])

	def test_unknown_variable_is_skipped(self):
		self.assertEqual(extract(ConstantParameter(value='{not_exist}')), [])

	def test_plain_variable_falls_back_to_trigger_topic(self):
		deps = extract(ConstantParameter(value='{order_no}'))
		self.assertEqual(deps, [(TRIGGER_TOPIC_ID, 'f-order-no', RelationType.ConstantsReference, None)])

	def test_prefixed_variable(self):
		deps = extract(ConstantParameter(value='ORD-{order_no}'))
		self.assertEqual(deps, [(TRIGGER_TOPIC_ID, 'f-order-no', RelationType.ConstantsReference, None)])

	def test_dotted_factor_name_on_trigger_topic(self):
		deps = extract(ConstantParameter(value='{customer.city}'))
		self.assertEqual(deps, [(TRIGGER_TOPIC_ID, 'f-customer-city', RelationType.ConstantsReference, None)])

	def test_duplicate_references_are_deduped(self):
		deps = extract(ConstantParameter(value='{order_no}-{order_no}'))
		self.assertEqual(len(deps), 1)

	def test_now_and_next_seq_carry_no_dependency(self):
		self.assertEqual(extract(ConstantParameter(value='{&now}')), [])
		self.assertEqual(extract(ConstantParameter(value='{&nextSeq}')), [])

	def test_old_reference(self):
		deps = extract(ConstantParameter(value='{&old.status}'))
		self.assertEqual(deps, [(TRIGGER_TOPIC_ID, 'f-status', RelationType.ConstantsReference, None)])

	def test_day_diff_resolves_both_parameters(self):
		deps = extract(ConstantParameter(value='{&dayDiff(order_no,status)}'))
		self.assertEqual(
			[dep[:2] for dep in deps],
			[(TRIGGER_TOPIC_ID, 'f-order-no'), (TRIGGER_TOPIC_ID, 'f-status')])

	def test_move_date_resolves_first_parameter_only(self):
		deps = extract(ConstantParameter(value='{&moveDate(order_no,1d)}'))
		self.assertEqual([dep[:2] for dep in deps], [(TRIGGER_TOPIC_ID, 'f-order-no')])

	def test_malformed_constant_is_skipped(self):
		self.assertEqual(extract(ConstantParameter(value='{&dayDiff(}')), [])


class TestVariableContextResolution(unittest.TestCase):
	def test_read_factor_variable(self):
		context = build_context([ReadFactorAction(
			variableName='scoreVar', topicId=READ_TOPIC_ID, factorId='f-score')])
		deps = extract_factor_dependencies(
			ConstantParameter(value='{scoreVar}'), RelationType.Direct, None, context, resolve_topic)
		self.assertEqual([dep[:2] for dep in deps], [(READ_TOPIC_ID, 'f-score')])

	def test_read_row_variable_with_factor_name(self):
		context = build_context([ReadRowAction(variableName='rowVar', topicId=ROW_TOPIC_ID)])
		deps = extract_factor_dependencies(
			ConstantParameter(value='{rowVar.amount}'), RelationType.Direct, None, context, resolve_topic)
		self.assertEqual([dep[:2] for dep in deps], [(ROW_TOPIC_ID, 'f-amount')])

	def test_read_row_variable_whole_row_has_no_factor(self):
		context = build_context([ReadRowAction(variableName='rowVar', topicId=ROW_TOPIC_ID)])
		deps = extract_factor_dependencies(
			ConstantParameter(value='{rowVar}'), RelationType.Direct, None, context, resolve_topic)
		self.assertEqual(deps, [])

	def test_read_row_variable_aggregate_segment_is_shaping(self):
		# aggregate functions appear as a standalone segment, e.g. {rowVar.amount.&sum}
		context = build_context([ReadRowAction(variableName='rowVar', topicId=ROW_TOPIC_ID)])
		deps = extract_factor_dependencies(
			ConstantParameter(value='{rowVar.amount.&sum}'), RelationType.Direct, None, context, resolve_topic)
		self.assertEqual([dep[:2] for dep in deps], [(ROW_TOPIC_ID, 'f-amount')])

	def test_memory_variable(self):
		context = build_context([CopyToMemoryAction(
			variableName='memVar',
			source={'kind': 'topic', 'topicId': READ_TOPIC_ID, 'factorId': 'f-level'})])
		deps = extract_factor_dependencies(
			ConstantParameter(value='{memVar}'), RelationType.Direct, None, context, resolve_topic)
		self.assertEqual([dep[:2] for dep in deps], [(READ_TOPIC_ID, 'f-level')])

	def test_memory_variable_cycle_does_not_loop(self):
		context = build_context([CopyToMemoryAction(
			variableName='loopVar', source={'kind': 'constant', 'value': '{loopVar}'})])
		deps = extract_factor_dependencies(
			ConstantParameter(value='{loopVar}'), RelationType.Direct, None, context, resolve_topic)
		self.assertEqual(deps, [])

	def test_explicit_variable_wins_over_trigger_topic(self):
		# a trigger factor sharing the variable name must not shadow the read action
		context = build_context([ReadFactorAction(
			variableName='order_no', topicId=READ_TOPIC_ID, factorId='f-score')])
		deps = extract_factor_dependencies(
			ConstantParameter(value='{order_no}'), RelationType.Direct, None, context, resolve_topic)
		self.assertEqual([dep[:2] for dep in deps], [(READ_TOPIC_ID, 'f-score')])


class TestComputedParameterDependencies(unittest.TestCase):
	def test_topic_parameter(self):
		deps = extract_factor_dependencies(
			TopicFactorParameter(topicId=READ_TOPIC_ID, factorId='f-score'),
			RelationType.Direct, None, build_context([]), resolve_topic)
		self.assertEqual(deps, [(READ_TOPIC_ID, 'f-score', RelationType.Direct, None)])

	def test_computed_with_nested_constant(self):
		source = ComputedParameter(type=ParameterComputeType.ADD, parameters=[
			TopicFactorParameter(topicId=READ_TOPIC_ID, factorId='f-score'),
			ConstantParameter(value='{order_no}')
		])
		deps = extract_factor_dependencies(
			source, RelationType.Direct, None, build_context([]), resolve_topic)
		self.assertEqual(
			[dep[:2] for dep in deps],
			[(READ_TOPIC_ID, 'f-score'), (TRIGGER_TOPIC_ID, 'f-order-no')])
		# the nested topic factor keeps the computed relation, the constant reference is tagged as its own
		self.assertEqual(deps[0][2], RelationType.Computed)
		self.assertEqual(deps[1][2], RelationType.ConstantsReference)
		self.assertTrue(all(dep[3] == ParameterComputeType.ADD for dep in deps))

	def test_none_source(self):
		self.assertEqual(extract_factor_dependencies(
			None, RelationType.Direct, None, build_context([]), resolve_topic), [])


if __name__ == '__main__':
	unittest.main()
