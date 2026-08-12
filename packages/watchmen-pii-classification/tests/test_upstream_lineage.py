"""Tests for the upstream lineage tracer.

These build real ``Pipeline`` / ``Topic`` / ``Factor`` objects from
``watchmen_model`` and exercise ``UpstreamLineageResolver._trace`` against a
hand-built topology, bypassing storage by stubbing ``_load_all_pipelines``,
``_resolve_topic`` and ``_resolve_factor`` — the same stub style as the
downstream tracer tests.

Topology under test (data flows X -> Y -> Z)::

    topic X (factor fx)
        |
        v
    pipeline P (trigger = X, writes topic Y factor fy via WriteFactorAction)
        |
        v
    topic Y (factor fy)
        |
        v
    pipeline Q (trigger = Y, writes topic Z factor fz via InsertRowAction)
        |
        v
    topic Z (factor fz)   [leaf — nothing writes it further]

Upstream tracing starts at Z and must reach Y and X.
"""
import pytest

from watchmen_model.admin import (
	Factor,
	Pipeline,
	PipelineStage,
	PipelineUnit,
	Topic,
)
from watchmen_model.admin.pipeline_action_write import (
	InsertRowAction,
	MappingFactor,
	WriteFactorAction,
)
from watchmen_model.common import TopicFactorParameter

from watchmen_pii.service.upstream_lineage import UpstreamLineageResolver


def _factor(factor_id, name):
	f = Factor()
	f.factorId = factor_id
	f.name = name
	return f


def _topic(topic_id, name, factors):
	t = Topic()
	t.topicId = topic_id
	t.name = name
	t.factors = factors
	return t


def _pipeline(pipeline_id, name, trigger_topic_id, actions):
	p = Pipeline()
	p.pipelineId = pipeline_id
	p.name = name
	p.topicId = trigger_topic_id
	p.enabled = True
	p.validated = True
	unit = PipelineUnit()
	unit.do = actions
	stage = PipelineStage()
	stage.units = [unit]
	p.stages = [stage]
	return p


def _write_factor_action(target_topic_id, target_factor_id, source_topic_id, source_factor_id):
	wfa = WriteFactorAction()
	wfa.topicId = target_topic_id
	wfa.factorId = target_factor_id
	wfa.source = TopicFactorParameter(topicId=source_topic_id, factorId=source_factor_id)
	return wfa


def _insert_row_action(target_topic_id, mapping_source_topic_id, mapping_source_factor_id, mapping_target_factor_id):
	mapping = MappingFactor()
	mapping.factorId = mapping_target_factor_id
	mapping.source = TopicFactorParameter(
		topicId=mapping_source_topic_id, factorId=mapping_source_factor_id
	)
	action = InsertRowAction()
	action.topicId = target_topic_id
	action.mapping = [mapping]
	return action


class _StubbedResolver(UpstreamLineageResolver):
	"""Bypasses storage by injecting the topology directly."""

	def __init__(self, topics_by_id, pipelines):
		# Skip the real __init__ (which wires real services + ask_meta_storage).
		self._principal_service = None
		self.max_depth = 3
		self._topics_by_id = topics_by_id
		self._pipelines = pipelines
		self._topic_cache = {}

	def _load_all_pipelines(self, tenant_id):
		return list(self._pipelines)

	def _resolve_topic(self, topic_id):
		return self._topics_by_id.get(topic_id)

	def _resolve_factor(self, topic, factor_id):
		if topic is None:
			return None
		for f in topic.factors or []:
			if f.factorId == factor_id:
				return f
		return None


@pytest.fixture
def topology():
	x = _topic('X', 'topic-x', [_factor('fx', 'amount')])
	y = _topic('Y', 'topic-y', [_factor('fy', 'amount_derived')])
	z = _topic('Z', 'topic-z', [_factor('fz', 'final_amount')])
	pipeline_p = _pipeline('P', 'p-write', 'X', [
		_write_factor_action('Y', 'fy', 'X', 'fx'),
	])
	pipeline_q = _pipeline('Q', 'q-insert', 'Y', [
		_insert_row_action('Z', 'Y', 'fy', 'fz'),
	])
	topics = {'X': x, 'Y': y, 'Z': z}
	return topics, [pipeline_p, pipeline_q]


def test_upstream_trace_reaches_two_hops(topology):
	topics, pipelines = topology
	resolver = _StubbedResolver(topics, pipelines)
	routes = resolver.trace_upstream('Z', 'fz', tenant_id='t-tenant', max_depth=3)
	# At least one route should reach topic X (two hops upstream).
	all_topic_ids = set()
	for route in routes:
		for step in route.steps:
			if step.topicId:
				all_topic_ids.add(step.topicId)
	assert 'Y' in all_topic_ids
	assert 'X' in all_topic_ids


def test_upstream_trace_respects_depth_limit(topology):
	topics, pipelines = topology
	resolver = _StubbedResolver(topics, pipelines)
	routes = resolver.trace_upstream('Z', 'fz', tenant_id='t-tenant', max_depth=1)
	# With depth 1 we should reach Y but not X.
	all_topic_ids = set()
	for route in routes:
		for step in route.steps:
			if step.topicId:
				all_topic_ids.add(step.topicId)
	assert 'Y' in all_topic_ids
	assert 'X' not in all_topic_ids


def test_upstream_trace_starts_from_writing_pipeline(topology):
	topics, pipelines = topology
	resolver = _StubbedResolver(topics, pipelines)
	routes = resolver.trace_upstream('Z', 'fz', tenant_id='t-tenant', max_depth=3)
	# Every route's first step should reference pipeline Q (which writes Z).
	assert routes, "expected at least one upstream route"
	first_steps = [r.steps[0] for r in routes if r.steps]
	assert all(s.pipelineId == 'Q' for s in first_steps)


def test_upstream_trace_stops_on_cycle(topology):
	topics, pipelines = topology
	# Add a pipeline that writes X from Z, closing a cycle X <- ... <- Z <- X.
	pipeline_r = _pipeline('R', 'r-cycle', 'Z', [
		_write_factor_action('X', 'fx', 'Z', 'fz'),
	])
	resolver = _StubbedResolver(topics, pipelines + [pipeline_r])
	routes = resolver.trace_upstream('X', 'fx', tenant_id='t-tenant', max_depth=10)
	assert routes, "expected at least one upstream route"
	diagnostics = [d for route in routes for d in route.diagnostics]
	assert any('Cycle detected' in d for d in diagnostics)


def test_upstream_trace_empty_when_no_writing_pipeline(topology):
	topics, pipelines = topology
	resolver = _StubbedResolver(topics, pipelines)
	# X has no upstream writer.
	routes = resolver.trace_upstream('X', 'fx', tenant_id='t-tenant', max_depth=3)
	assert routes == []


def test_upstream_trace_empty_for_unknown_topic(topology):
	topics, pipelines = topology
	resolver = _StubbedResolver(topics, pipelines)
	routes = resolver.trace_upstream('unknown', 'fx', tenant_id='t-tenant', max_depth=3)
	assert routes == []


def test_pipeline_writes_target_score_via_write_factor():
	# Direct unit-style test of the static scoring for a WriteFactorAction hit.
	action = _write_factor_action('Z', 'fz', 'Y', 'fy')
	score = UpstreamLineageResolver._write_action_target_score(action, 'Z', 'fz')
	assert score == 4
	# Wrong factor on the right topic does not score for WriteFactor.
	assert UpstreamLineageResolver._write_action_target_score(action, 'Z', 'other') == 0
	# Whole-topic tracing still scores.
	assert UpstreamLineageResolver._write_action_target_score(action, 'Z', None) == 2
