"""Upstream lineage tracer.

The mirror image of :mod:`watchmen_pii.service.downstream_lineage`: starting
from a topic+factor, find the pipelines that *write* it (WriteFactor /
InsertRow / MergeRow actions whose target topic is the current one), walk to
the (topic, factor) pairs those pipelines *read* from (mapping sources,
WriteFactor sources, ``by`` joints), and recurse.

The scoring and dependency-extraction heuristics follow the same rules the
metric lineage resolver uses (``_pipeline_writes_target_score`` /
``_extract_upstream_dependencies_from_pipeline``), re-implemented here so this
package has no dependency on watchmen-metricflow.
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

from watchmen_pii.model import PiiTraceRoute, PiiTraceStep
from watchmen_pii.util import trans_readonly

logger = getLogger(__name__)


@dataclass
class UpstreamDependency:
	"""A (topic, factor) read by a pipeline upstream of the target."""

	topic_id: Optional[str] = None
	factor_id: Optional[str] = None


@dataclass
class UpstreamTraceContext:
	"""One recursive trace call's working state."""

	topic_id: str
	factor_id: Optional[str]
	depth: int
	visited_topic_keys: Set[str] = field(default_factory=set)
	visited_pipeline_ids: Set[str] = field(default_factory=set)


class UpstreamLineageResolver:
	"""Traces where a topic+factor's data comes from."""

	def __init__(
			self,
			principal_service: PrincipalService,
			max_depth: int = 3,
			pii_term_service=None,
	) -> None:
		self._principal_service = principal_service
		self.max_depth = max_depth
		# When a request-scoped PIITermService is given, the internal services
		# share its storage instance, so every read lands on the transaction the
		# caller (router) already opened. Only a standalone resolver owns its
		# storage and wraps reads in transactions itself.
		self._owns_storage = pii_term_service is None
		if self._owns_storage:
			storage = ask_meta_storage()
			snowflake_generator = ask_snowflake_generator()
		else:
			storage = pii_term_service.storage
			snowflake_generator = pii_term_service.snowflakeGenerator
		self._topic_service = TopicService(storage, snowflake_generator, principal_service)
		self._pipeline_service = PipelineService(storage, snowflake_generator, principal_service)
		self._pipelines_cache: Optional[List[Pipeline]] = None
		self._topic_cache: dict = {}

	# ------------------------------------------------------------------ public

	def trace_upstream(
			self,
			topic_id: str,
			factor_id: Optional[str],
			tenant_id: str,
			max_depth: Optional[int] = None,
	) -> List[PiiTraceRoute]:
		"""Trace upstream routes from ``topic_id[:factor_id]``.

		Returns a list of :class:`PiiTraceRoute`, each describing one path from
		the current topic back towards its sources.
		"""
		if not topic_id:
			return []
		depth_limit = self.max_depth if max_depth is None else max_depth
		context = UpstreamTraceContext(
			topic_id=topic_id,
			factor_id=factor_id,
			depth=0,
			visited_topic_keys={_topic_key(topic_id, factor_id)},
			visited_pipeline_ids=set(),
		)
		return self._trace(context, tenant_id, depth_limit)

	# ------------------------------------------------------------------ core recursion

	def _trace(
			self, context: UpstreamTraceContext, tenant_id: str, depth_limit: int
	) -> List[PiiTraceRoute]:
		if context.depth >= depth_limit:
			return []

		writing_pipelines = self._find_pipelines_writing_topic_factor(
			context.topic_id, context.factor_id, tenant_id
		)
		if not writing_pipelines:
			return []

		routes: List[PiiTraceRoute] = []
		for pipeline in writing_pipelines:
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

			dependencies, diagnostics = self._extract_upstream_dependencies_from_pipeline(
				pipeline, context.topic_id, context.factor_id
			)
			if not dependencies and pipeline.topicId:
				# No factor-level mapping resolved; fall back to the trigger topic.
				dependencies = [UpstreamDependency(topic_id=pipeline.topicId)]
				diagnostics = diagnostics + [
					f"Pipeline[{pipeline.name or pipeline.pipelineId}] used trigger topic fallback "
					f"for upstream trace."
				]

			if not dependencies:
				routes.append(PiiTraceRoute(
					id=f"upstream-{context.depth}-{self._sanitize(pipeline_id)}",
					title=f"Pipeline[{pipeline.name or pipeline.pipelineId}]",
					steps=pipeline_step,
					diagnostics=diagnostics or [
						f"Pipeline[{pipeline.name or pipeline.pipelineId}] writes "
						f"topic[{context.topic_id}] but its upstream sources were not resolved."
					],
				))
				continue

			for dependency in dependencies:
				upstream_topic = self._resolve_topic(dependency.topic_id)
				upstream_factor = self._resolve_factor(upstream_topic, dependency.factor_id)
				dependency_steps = list(pipeline_step)
				if upstream_topic is not None:
					dependency_steps.append(PiiTraceStep(
						kind='topic', topicId=upstream_topic.topicId, topicName=upstream_topic.name))
					if upstream_factor is not None:
						dependency_steps.append(PiiTraceStep(
							kind='topic_factor',
							topicId=upstream_topic.topicId, topicName=upstream_topic.name,
							factorId=upstream_factor.factorId, factorName=upstream_factor.name,
						))

				if _topic_key(dependency.topic_id, dependency.factor_id) in context.visited_topic_keys:
					routes.append(PiiTraceRoute(
						id=f"upstream-{context.depth}-{self._sanitize(pipeline_id)}-cycle",
						title=f"Pipeline[{pipeline.name or pipeline.pipelineId}]",
						steps=dependency_steps,
						diagnostics=diagnostics + ["Cycle detected; recursion stopped."],
					))
					continue

				next_topic_keys = set(context.visited_topic_keys)
				next_topic_keys.add(_topic_key(dependency.topic_id, dependency.factor_id))
				child_context = UpstreamTraceContext(
					topic_id=dependency.topic_id or '',
					factor_id=dependency.factor_id,
					depth=context.depth + 1,
					visited_topic_keys=next_topic_keys,
					visited_pipeline_ids=next_pipeline_ids,
				)
				child_routes = self._trace(child_context, tenant_id, depth_limit)
				if not child_routes:
					routes.append(PiiTraceRoute(
						id=f"upstream-{context.depth}-{self._sanitize(pipeline_id)}-{self._sanitize(dependency.topic_id or '')}",
						title=f"Pipeline[{pipeline.name or pipeline.pipelineId}]",
						steps=dependency_steps,
						diagnostics=diagnostics + (
							[f"Upstream topic[{dependency.topic_id}] could not be further resolved."]
							if upstream_topic is None else []
						),
					))
				else:
					for child in child_routes:
						routes.append(PiiTraceRoute(
							id=f"upstream-{context.depth}-{self._sanitize(pipeline_id)}-{child.id}",
							title=f"Pipeline[{pipeline.name or pipeline.pipelineId}] -> {child.title}",
							steps=dependency_steps + child.steps,
							diagnostics=diagnostics + child.diagnostics,
						))
		return routes

	# ------------------------------------------------------------------ pipeline selection

	def _find_pipelines_writing_topic_factor(
			self, topic_id: str, factor_id: Optional[str], tenant_id: str
	) -> List[Pipeline]:
		"""Return pipelines that write ``topic_id[:factor_id]``, best first."""
		matches: List[Tuple[int, Pipeline]] = []
		for pipeline in self._load_all_pipelines(tenant_id):
			score = self._pipeline_writes_target_score(pipeline, topic_id, factor_id)
			if score > 0:
				matches.append((score, pipeline))
		matches.sort(key=lambda item: (
			-item[0], not bool(item[1].enabled), not bool(item[1].validated),
			item[1].name or '', item[1].pipelineId or '',
		))
		return [p for _, p in matches]

	def _pipeline_writes_target_score(
			self, pipeline: Pipeline, topic_id: Optional[str], factor_id: Optional[str]
	) -> int:
		if topic_id is None:
			return 0
		score = 0
		for action in self._iter_actions(pipeline):
			score = max(score, self._write_action_target_score(action, topic_id, factor_id))
		return score

	@staticmethod
	def _write_action_target_score(
			action: PipelineAction, topic_id: str, factor_id: Optional[str]
	) -> int:
		"""Score how strongly an action writes into ``topic_id[:factor_id]``."""
		if getattr(action, 'topicId', None) != topic_id:
			return 0
		if isinstance(action, WriteFactorAction):
			if factor_id is None:
				return 2
			return 4 if getattr(action, 'factorId', None) == factor_id else 0
		if isinstance(action, (InsertRowAction, MergeRowAction, InsertOrMergeRowAction)):
			if factor_id is None:
				return 2
			for mapping in getattr(action, 'mapping', []) or []:
				if getattr(mapping, 'factorId', None) == factor_id:
					return 3
			return 1
		return 0

	# ------------------------------------------------------------------ dependency extraction

	def _extract_upstream_dependencies_from_pipeline(
			self, pipeline: Pipeline, target_topic_id: str, target_factor_id: Optional[str]
	) -> Tuple[List[UpstreamDependency], List[str]]:
		"""Extract the (topic, factor) pairs the pipeline reads to write the target."""
		dependencies: List[UpstreamDependency] = []
		diagnostics: List[str] = []
		for action in self._iter_actions(pipeline):
			if isinstance(action, WriteFactorAction):
				if self._write_action_target_score(action, target_topic_id, target_factor_id) == 0:
					continue
				dependencies.extend(self._extract_dependencies_from_parameter(
					getattr(action, 'source', None)))
				dependencies.extend(self._extract_dependencies_from_joint(getattr(action, 'by', None)))
			elif isinstance(action, (InsertRowAction, MergeRowAction, InsertOrMergeRowAction)):
				if getattr(action, 'topicId', None) != target_topic_id:
					continue
				matched = False
				for mapping in getattr(action, 'mapping', []) or []:
					if target_factor_id is not None and getattr(mapping, 'factorId', None) != target_factor_id:
						continue
					matched = True
					dependencies.extend(self._extract_dependencies_from_parameter(
						getattr(mapping, 'source', None)))
				if matched or target_factor_id is None:
					dependencies.extend(self._extract_dependencies_from_joint(getattr(action, 'by', None)))

		deduped = self._deduplicate_dependencies(dependencies)
		if not deduped:
			diagnostics.append(
				f"Pipeline[{pipeline.name or pipeline.pipelineId}] writes topic[{target_topic_id}] "
				f"but upstream factor mapping was not resolved."
			)
		return deduped, diagnostics

	def _extract_dependencies_from_joint(
			self, joint: Optional[ParameterCondition]
	) -> List[UpstreamDependency]:
		if joint is None:
			return []
		if isinstance(joint, ParameterExpression):
			return (self._extract_dependencies_from_parameter(joint.left)
					+ self._extract_dependencies_from_parameter(joint.right))
		if isinstance(joint, ParameterJoint):
			dependencies: List[UpstreamDependency] = []
			for condition in joint.filters or []:
				dependencies.extend(self._extract_dependencies_from_joint(condition))
			return dependencies
		return []

	def _extract_dependencies_from_parameter(
			self, parameter: Optional[Parameter]
	) -> List[UpstreamDependency]:
		if parameter is None:
			return []
		dependencies = self._extract_dependencies_from_joint(getattr(parameter, 'on', None))
		if isinstance(parameter, TopicFactorParameter):
			dependencies.append(UpstreamDependency(
				topic_id=parameter.topicId, factor_id=parameter.factorId))
		elif isinstance(parameter, ComputedParameter):
			for nested in parameter.parameters or []:
				dependencies.extend(self._extract_dependencies_from_parameter(nested))
		return dependencies

	# ------------------------------------------------------------------ caches & helpers

	def _readonly(self, service, action):
		"""Run a read; open a transaction only when this resolver owns its
		storage (a shared request storage already runs inside one)."""
		if self._owns_storage:
			return trans_readonly(service, action)
		return action()

	def _load_all_pipelines(self, tenant_id: str) -> List[Pipeline]:
		if self._pipelines_cache is None:
			pipelines = self._readonly(
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
		topic = self._readonly(
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
	def _deduplicate_dependencies(dependencies: List[UpstreamDependency]) -> List[UpstreamDependency]:
		deduped: List[UpstreamDependency] = []
		seen: Set[Tuple[Optional[str], Optional[str]]] = set()
		for dependency in dependencies:
			key = (dependency.topic_id, dependency.factor_id)
			if key in seen or dependency.topic_id is None:
				continue
			seen.add(key)
			deduped.append(dependency)
		return deduped

	@staticmethod
	def _sanitize(value: str) -> str:
		"""Make a string safe to embed in a route id."""
		if not value:
			return 'x'
		return ''.join(ch if ch.isalnum() else '-' for ch in value).strip('-') or 'x'


def _topic_key(topic_id: Optional[str], factor_id: Optional[str]) -> str:
	return f"{topic_id or ''}:{factor_id or '*'}"
