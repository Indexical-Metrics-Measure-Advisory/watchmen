"""Resolve a VirtualObjectAttribute (sourceTable=alias / sourceField=column) back to the underlying Factor.

A virtual attribute only records ``sourceTable`` (which may be an alias /
topicName / physical_name) and ``sourceField`` (the physical column name =
Factor.name). To obtain ``FactorType`` / ``FactorEncryptMethod`` we must first
restore alias -> ``PhysicalTableMapping`` -> ``topicName``, then use
``TopicService`` to load the ``Topic`` and match by name within its ``factors``.

``PhysicalTableMapping.topicId`` is dropped during agent-YAML round-trips (see
``router/ontology_router._ontology_to_agent_yaml`` which only emits topicName),
so we prefer ``topicName`` via ``find_by_name_and_tenant`` and use ``topicId``
only as a fallback.

Resolution failures (Topic / Factor missing, or TopicService not injected)
always return ``None``-equivalent (resolved=False) so the caller can fall back
to the legacy attribute-name heuristic, preserving backward compatibility.
"""

import logging
from typing import TYPE_CHECKING, Dict, List, Optional

from watchmen_auth import PrincipalService
from watchmen_model.admin import Factor, FactorEncryptMethod, FactorType, PhysicalTableMapping, VirtualObject, VirtualObjectAttribute

if TYPE_CHECKING:
	# Type annotation only; lazy-imported at runtime to avoid triggering the
	# module-level ask_meta_storage() initialization in watchmen_meta.common
	# in environments without a meta storage (e.g. unit tests).
	from watchmen_meta.admin import TopicService

logger = logging.getLogger(__name__)


class ResolvedFactor:
	"""Resolution result: carries both type and encrypt to avoid repeated lookups."""

	__slots__ = ('factor_type', 'encrypt', 'resolved')

	def __init__(
			self,
			factor_type: Optional[FactorType],
			encrypt: Optional[FactorEncryptMethod],
			resolved: bool,
	) -> None:
		self.factor_type = factor_type
		self.encrypt = encrypt
		# resolved=False means the underlying Factor could not be located
		# (caller should fall back to the name heuristic)
		self.resolved = resolved


class FactorTypeResolver:
	"""Batch-resolve Factor metadata for multiple attributes within one ontology query.

	A single query typically touches multiple attributes across the same set of
	physical tables, so Topics are cached by topicName to avoid repeated lookups.
	"""

	def __init__(
			self,
			topic_service: Optional["TopicService"],
			principal_service: PrincipalService,
	) -> None:
		self._topic_service = topic_service
		self._tenant_id = principal_service.get_tenant_id()
		# topicName -> Optional[Topic]; cache None explicitly to avoid re-querying missing topics
		self._topic_cache: Dict[str, Optional[object]] = {}

	def resolve_attributes(self, virtual_object: VirtualObject) -> Dict[str, ResolvedFactor]:
		"""Returns attribute.name -> ResolvedFactor. Resolves attributes only, not derived."""
		result: Dict[str, ResolvedFactor] = {}
		if not virtual_object.attributes:
			return result
		mappings_by_key = self._index_mappings(virtual_object)
		for attr in virtual_object.attributes:
			result[attr.name] = self._resolve_one(attr, mappings_by_key)
		return result

	# ---- internal -----------------------------------------------------------

	@staticmethod
	def _index_mappings(virtual_object: VirtualObject) -> Dict[str, PhysicalTableMapping]:
		"""Same semantics as OntologyTableFactory.find_table_for_mapping: alias /
		topicName / physical_name all map to the same mapping; alias wins by
		being written last."""
		indexed: Dict[str, PhysicalTableMapping] = {}
		for mapping in virtual_object.physicalTables or []:
			keys: List[str] = []
			if mapping.topicName:
				physical = mapping.topicName if mapping.topicName.startswith('topic_') else f'topic_{mapping.topicName}'
				keys.append(physical)
				keys.append(mapping.topicName)
			if mapping.alias:
				keys.append(mapping.alias)
			# alias is the most specific; written last so it takes precedence
			for key in keys:
				indexed[key] = mapping
		return indexed

	def _resolve_one(
			self,
			attr: VirtualObjectAttribute,
			mappings_by_key: Dict[str, PhysicalTableMapping],
	) -> ResolvedFactor:
		if self._topic_service is None:
			return ResolvedFactor(None, None, resolved=False)
		if not attr.sourceField:
			return ResolvedFactor(None, None, resolved=False)
		mapping = mappings_by_key.get(attr.sourceTable or '') if attr.sourceTable else None
		if mapping is None:
			return ResolvedFactor(None, None, resolved=False)
		topic = self._load_topic(mapping)
		if topic is None or not topic.factors:
			return ResolvedFactor(None, None, resolved=False)
		factor = next((f for f in topic.factors if f.name == attr.sourceField), None)
		if factor is None:
			return ResolvedFactor(None, None, resolved=False)
		return ResolvedFactor(
			factor_type=factor.type,
			encrypt=factor.encrypt,
			resolved=True,
		)

	def _load_topic(self, mapping: PhysicalTableMapping):
		# Prefer lookup by topicName + tenant (topicId is lost in agent-YAML round-trips)
		if mapping.topicName:
			cache_key = f'name::{mapping.topicName}'
			if cache_key in self._topic_cache:
				return self._topic_cache[cache_key]
			topic = None
			try:
				topic = self._topic_service.find_by_name_and_tenant(mapping.topicName, self._tenant_id)
			except Exception:  # noqa: BLE001 - resolution failure must not break the query; fall back to name heuristic
				logger.warning(
					'load topic by name failed | topic_name=%s | tenant_id=%s',
					mapping.topicName, self._tenant_id, exc_info=True,
				)
				topic = None
			self._topic_cache[cache_key] = topic
			return topic
		# fallback: topicId
		if mapping.topicId:
			cache_key = f'id::{mapping.topicId}'
			if cache_key in self._topic_cache:
				return self._topic_cache[cache_key]
			topic = None
			try:
				topic = self._topic_service.find_by_id(mapping.topicId)
			except Exception:  # noqa: BLE001
				logger.warning(
					'load topic by id failed | topic_id=%s', mapping.topicId, exc_info=True,
				)
				topic = None
			self._topic_cache[cache_key] = topic
			return topic
		return None
