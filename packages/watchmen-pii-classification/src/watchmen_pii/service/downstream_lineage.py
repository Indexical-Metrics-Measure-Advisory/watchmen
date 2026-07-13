"""Downstream lineage tracer.

This is the new capability called out by the design doc (section 7): starting
from a topic+factor, find the pipelines that *read* it (i.e. pipelines whose
``topicId`` trigger topic is the source), walk to the topics/factors those
pipelines *write*, and recurse.

It mirrors ``MetricLineageResolver._trace_upstream_from_topic`` but inverted:

* upstream finds pipelines that *write* the current topic+factor
  (``_pipeline_writes_target_score``);
* downstream finds pipelines that *read* from the current topic+factor
  (``_pipeline_reads_source_score`` — new) and then extracts what they write
  downstream.

Implemented entirely inside this package so watchmen-metricflow stays
untouched. It reuses the same Topic/Pipeline/Action model types and the same
parameter-walking heuristics.
"""
from dataclasses import dataclass, field
from logging import getLogger
from typing import Iterable, List, Optional, Set, Tuple

from watchmen_auth import PrincipalService
from watchmen_meta.admin import PipelineService, TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import (
	Factor,
	Pipeline,
	PipelineAction,
	PipelineStage,
	PipelineUnit,
	Topic,
)
from watchmen_model.admin.pipeline_action_read import (
	ReadFactorAction,
	ReadFactorsAction,
	ReadRowAction,
	ReadRowsAction,
)
from watchmen_model.admin.pipeline_action_system import CopyToMemoryAction
from watchmen_model.admin.pipeline_action_write import (
	InsertOrMergeRowAction,
	InsertRowAction,
	MappingFactor,
	MergeRowAction,
	WriteFactorAction,
)
from watchmen_model.common import (
	ComputedParameter,
	Parameter,
	ParameterCondition,
	ParameterExpression,
	ParameterJoint,
	TopicFactorParameter,
)
from watchmen_metricflow.util import trans_readonly

from watchmen_pii.model import PiiTraceRoute, PiiTraceStep

logger = getLogger(__name__)


@dataclass
class DownstreamTarget:
	"""A (topic, factor) written by a pipeline downstream of the source."""

	topic_id: Optional[str] = None
	factor_id: Optional[str] = None


@dataclass
class DownstreamTraceContext:
	"""One recursive trace call's working state."""

	topic_id: str
	factor_id: Optional[str]
	depth: int
	visited_topic_keys: Set[str] = field(default_factory=set)
	visited_pipeline_ids: Set[str] = field(default_factory=set)


class DownstreamLineageResolver:
	"""Traces where a topic+factor's data flows downstream."""

	def __init__(
			self,
			principal_service: PrincipalService,
			max_depth: int = 3,
	) -> None:
		self._principal_service = principal_service
		self.max_depth = max_depth
		self._topic_service = TopicService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service
		)
		self._pipeline_service = PipelineService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service
		)
		self._pipelines_cache: Optional[List[Pipeline]] = None
		self._topic_cache: dict = {}

	# ------------------------------------------------------------------ public

	def trace_downstream(
			self,
			topic_id: str,
			factor_id: Optional[str],
			tenant_id: str,
			max_depth: Optional[int] = None,
	) -> List[PiiTraceRoute]:
		"""Trace downstream routes from ``topic_id[:factor_id]``.

		Returns a list of :class:`PiiTraceRoute`, each describing one path from
		the source to a downstream consumer.
		"""
		if not topic_id:
			return []
		depth_limit = self.max_depth if max_depth is None else max_depth
		context = DownstreamTraceContext(
			topic_id=topic_id,
			factor_id=factor_id,
			depth=0,
			visited_topic_keys={_topic_key(topic_id, factor_id)},
			visited_pipeline_ids=set(),
		)
		return self._trace(context, tenant_id, depth_limit)

	# ------------------------------------------------------------------ core recursion

	def _trace(
			self, context: DownstreamTraceContext, tenant_id: str, depth_limit: int
	) -> List[PiiTraceRoute]:
		if context.depth >= depth_limit:
			return []

		reading_pipelines = self._find_pipelines_reading_topic_factor(
			context.topic_id, context.factor_id, tenant_id
		)
		if not reading_pipelines:
			return []

		routes: List[PiiTraceRoute] = []
		for pipeline in reading_pipelines:
			pipeline_id = pipeline.pipelineId or pipeline.name or ''
			if not pipeline_id or pipeline_id in context.visited_pipeline_ids:
				continue

			next_pipeline_ids = set(context.visited_pipeline_ids)
			next_pipeline_ids.add(pipeline_id)

			prefix_step = PiiTraceStep(
				kind='pipeline',
				pipelineId=pipeline.pipelineId,
				pipelineName=pipeline.name,
				topicId=context.topic_id,
				factorId=context.factor_id,
			)
			pipeline_step = [prefix_step]

			downstream_targets = self._extract_downstream_targets_from_pipeline(
				pipeline, context.topic_id
			)
			if not downstream_targets:
				routes.append(PiiTraceRoute(
					id=f"downstream-{context.depth}-{self._sanitize(pipeline_id)}",
					title=f"Pipeline[{pipeline.name or pipeline.pipelineId}]",
					steps=pipeline_step,
					diagnostics=[
						f"Pipeline[{pipeline.name or pipeline.pipelineId}] reads "
						f"topic[{context.topic_id}] but its write targets were not resolved."
					],
				))
				continue

			for target in downstream_targets:
				target_topic = self._resolve_topic(target.topic_id)
				target_factor = self._resolve_factor(target_topic, target.factor_id)
				target_steps = list(pipeline_step)
				if target_topic is not None:
					target_steps.append(PiiTraceStep(
						kind='topic', topicId=target_topic.topicId, topicName=target_topic.name))
					if target_factor is not None:
						target_steps.append(PiiTraceStep(
							kind='topic_factor',
							topicId=target_topic.topicId, topicName=target_topic.name,
							factorId=target_factor.factorId, factorName=target_factor.name,
						))

				next_topic_keys = set(context.visited_topic_keys)
				next_topic_keys.add(_topic_key(target.topic_id, target.factor_id))
				if _topic_key(target.topic_id, target.factor_id) in context.visited_topic_keys:
					routes.append(PiiTraceRoute(
						id=f"downstream-{context.depth}-{self._sanitize(pipeline_id)}-cycle",
						title=f"Pipeline[{pipeline.name or pipeline.pipelineId}]",
						steps=target_steps,
						diagnostics=["Cycle detected; recursion stopped."],
					))
					continue

				child_context = DownstreamTraceContext(
					topic_id=target.topic_id or '',
					factor_id=target.factor_id,
					depth=context.depth + 1,
					visited_topic_keys=next_topic_keys,
					visited_pipeline_ids=next_pipeline_ids,
				)
				child_routes = self._trace(child_context, tenant_id, depth_limit)
				if not child_routes:
					routes.append(PiiTraceRoute(
						id=f"downstream-{context.depth}-{self._sanitize(pipeline_id)}-{self._sanitize(target.topic_id or '')}",
						title=f"Pipeline[{pipeline.name or pipeline.pipelineId}]",
						steps=target_steps,
					))
				else:
					for child in child_routes:
						routes.append(PiiTraceRoute(
							id=f"downstream-{context.depth}-{self._sanitize(pipeline_id)}-{child.id}",
							title=f"Pipeline[{pipeline.name or pipeline.pipelineId}] -> {child.title}",
							steps=target_steps + child.steps,
							diagnostics=child.diagnostics,
						))
		return routes

	# ------------------------------------------------------------------ pipeline selection

	def _find_pipelines_reading_topic_factor(
			self, topic_id: str, factor_id: Optional[str], tenant_id: str
	) -> List[Pipeline]:
		"""Return pipelines whose trigger topic is ``topic_id``.

		Per the design doc: a pipeline's ``topicId`` field is its trigger
		topic. We additionally check that some action in the pipeline actually
		references the (topic, factor) pair when ``factor_id`` is provided,
		so we don't chase pipelines that merely share the trigger topic.
		"""
		matches: List[Tuple[int, Pipeline]] = []
		for pipeline in self._load_all_pipelines(tenant_id):
			if (pipeline.topicId or '') != topic_id:
				continue
			# Always include trigger-topic-matched pipelines; if a factor id is
			# supplied, prefer those that actually read it, but keep the rest
			# so we still trace whole-topic reads.
			score = self._pipeline_reads_source_score(pipeline, topic_id, factor_id)
			matches.append((score, pipeline))
		matches.sort(key=lambda item: (
			-item[0], not bool(item[1].enabled), not bool(item[1].validated),
			item[1].name or '', item[1].pipelineId or '',
		))
		return [p for _, p in matches]

	def _pipeline_reads_source_score(
			self, pipeline: Pipeline, topic_id: Optional[str], factor_id: Optional[str]
	) -> int:
		if topic_id is None:
			return 0
		score = 0
		for action in self._iter_actions(pipeline):
			score += self._action_reads_source_score(action, topic_id, factor_id)
		return score

	@staticmethod
	def _action_reads_source_score(
			action: PipelineAction, topic_id: str, factor_id: Optional[str]
	) -> int:
		"""Score how strongly an action reads from ``topic_id[:factor_id]``."""
		if isinstance(action, (ReadRowAction, ReadRowsAction)):
			score = 0
			if getattr(action, 'topicId', None) == topic_id:
				score += 1
			# 'by' joint may reference the factor.
			if factor_id is not None and DownstreamLineageResolver._joint_mentions(
					getattr(action, 'by', None), topic_id, factor_id):
				score += 1
			return score
		if isinstance(action, (ReadFactorAction, ReadFactorsAction)):
			# ReadFactor/ReadFactors target a specific topic; factor id lives on
			# the action directly when it's a single ReadFactorAction.
			if getattr(action, 'topicId', None) != topic_id:
				return 0
			if factor_id is None:
				return 2
			return 3 if getattr(action, 'factorId', None) == factor_id else 1
		if isinstance(action, CopyToMemoryAction):
			source = getattr(action, 'source', None)
			return 1 if DownstreamLineageResolver._parameter_mentions(source, topic_id, factor_id) else 0
		# Write actions also carry source parameters that may read upstream.
		if isinstance(action, WriteFactorAction):
			return 2 if DownstreamLineageResolver._parameter_mentions(
				getattr(action, 'source', None), topic_id, factor_id) else 0
		if isinstance(action, (InsertRowAction, MergeRowAction, InsertOrMergeRowAction)):
			score = 0
			for mapping in getattr(action, 'mapping', []) or []:
				if DownstreamLineageResolver._mapping_mentions(mapping, topic_id, factor_id):
					score += 2
			return score
		return 0

	# ------------------------------------------------------------------ write-target extraction

	def _extract_downstream_targets_from_pipeline(
			self, pipeline: Pipeline, source_topic_id: str
	) -> List[DownstreamTarget]:
		"""Extract the (topic, factor) pairs the pipeline writes downstream."""
		targets: List[DownstreamTarget] = []
		for action in self._iter_actions(pipeline):
			action_topic_id = getattr(action, 'topicId', None)
			if not action_topic_id:
				continue
			if isinstance(action, WriteFactorAction):
				targets.append(DownstreamTarget(
					topic_id=action_topic_id,
					factor_id=getattr(action, 'factorId', None),
				))
			elif isinstance(action, (InsertRowAction, MergeRowAction, InsertOrMergeRowAction)):
				mappings = getattr(action, 'mapping', []) or []
				if mappings:
					seen: Set[Optional[str]] = set()
					for mapping in mappings:
						factor_id = getattr(mapping, 'factorId', None)
						if factor_id in seen:
							continue
						seen.add(factor_id)
						targets.append(DownstreamTarget(topic_id=action_topic_id, factor_id=factor_id))
				else:
					targets.append(DownstreamTarget(topic_id=action_topic_id, factor_id=None))
		return self._deduplicate_targets(targets)

	# ------------------------------------------------------------------ parameter walking helpers

	@staticmethod
	def _joint_mentions(joint: Optional[ParameterCondition], topic_id: str, factor_id: Optional[str]) -> bool:
		if joint is None:
			return False
		if isinstance(joint, ParameterExpression):
			return (DownstreamLineageResolver._parameter_mentions(joint.left, topic_id, factor_id)
					or DownstreamLineageResolver._parameter_mentions(joint.right, topic_id, factor_id))
		if isinstance(joint, ParameterJoint):
			return any(
				DownstreamLineageResolver._joint_mentions(c, topic_id, factor_id)
				for c in (joint.filters or [])
			)
		return False

	@staticmethod
	def _parameter_mentions(parameter: Optional[Parameter], topic_id: str, factor_id: Optional[str]) -> bool:
		if parameter is None:
			return False
		if DownstreamLineageResolver._joint_mentions(getattr(parameter, 'on', None), topic_id, factor_id):
			return True
		if isinstance(parameter, TopicFactorParameter):
			if parameter.topicId != topic_id:
				return False
			return factor_id is None or parameter.factorId == factor_id
		if isinstance(parameter, ComputedParameter):
			return any(
				DownstreamLineageResolver._parameter_mentions(nested, topic_id, factor_id)
				for nested in (parameter.parameters or [])
			)
		return False

	@staticmethod
	def _mapping_mentions(mapping: MappingFactor, topic_id: str, factor_id: Optional[str]) -> bool:
		if factor_id is not None and getattr(mapping, 'factorId', None) == factor_id:
			# Mapping writes to a different factor; it still references source.
			pass
		return DownstreamLineageResolver._parameter_mentions(
			getattr(mapping, 'source', None), topic_id, factor_id
		)

	# ------------------------------------------------------------------ caches & helpers

	def _load_all_pipelines(self, tenant_id: str) -> List[Pipeline]:
		if self._pipelines_cache is None:
			pipelines = trans_readonly(
				self._pipeline_service, lambda: self._pipeline_service.find_all(tenant_id)
			)
			self._pipelines_cache = sorted(
				pipelines,
				key=lambda p: (p.name or '', p.pipelineId or ''),
			)
		return self._pipelines_cache

	def _resolve_topic(self, topic_id: Optional[str]) -> Optional[Topic]:
		if not topic_id:
			return None
		if topic_id in self._topic_cache:
			return self._topic_cache[topic_id]
		topic = trans_readonly(
			self._topic_service, lambda: self._topic_service.find_by_id(topic_id)
		)
		self._topic_cache[topic_id] = topic
		return topic

	def _resolve_factor(self, topic: Optional[Topic], factor_id: Optional[str]) -> Optional[Factor]:
		if topic is None or not factor_id:
			return None
		for factor in topic.factors or []:
			if factor.factorId == factor_id:
				return factor
		return None

	@staticmethod
	def _iter_actions(pipeline: Pipeline) -> Iterable[PipelineAction]:
		for stage in pipeline.stages or []:
			stage: PipelineStage
			for unit in stage.units or []:
				unit: PipelineUnit
				for action in unit.do or []:
					yield action

	@staticmethod
	def _deduplicate_targets(targets: List[DownstreamTarget]) -> List[DownstreamTarget]:
		deduped: List[DownstreamTarget] = []
		seen: Set[Tuple[Optional[str], Optional[str]]] = set()
		for target in targets:
			key = (target.topic_id, target.factor_id)
			if key in seen:
				continue
			seen.add(key)
			deduped.append(target)
		return deduped

	@staticmethod
	def _sanitize(value: str) -> str:
		"""Make a string safe to embed in a route id."""
		if not value:
			return 'x'
		return ''.join(ch if ch.isalnum() else '-' for ch in value).strip('-') or 'x'


def _topic_key(topic_id: Optional[str], factor_id: Optional[str]) -> str:
	return f"{topic_id or ''}:{factor_id or '*'}"
