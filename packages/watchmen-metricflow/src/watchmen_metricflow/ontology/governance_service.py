"""Ontology governance map projection.

Assembles the GET /ontology/governance/map response: for every virtual object
attribute, resolve the underlying Topic/Factor (alias -> PhysicalTableMapping,
sourceField -> Factor.name) and collect governance signals -- encrypt /
sensitive factor type / query-time masking (aligned with
``security_layer.OntologySecurityLayer._classify_attribute``), PII
classification term hits (linked factors, confirmed vs pending) and associated
DQC monitor rules (TOPIC grade by topicId, FACTOR grade by topicId+factorId,
plus GLOBAL grade rules).

Unresolvable attributes never fail the projection: they keep null topic/factor
fields, empty piiTerms/monitorRules and false sensitiveType/masked.

Services are injected so the projection is unit-testable without a storage;
``from_primary_service`` wires the real meta services sharing the caller's
storage/transaction (ask_meta_storage() creates a fresh storage per call).
"""
import logging
from typing import Dict, List, Optional, Tuple, TYPE_CHECKING

from watchmen_auth import PrincipalService
from watchmen_model.admin import Factor, FactorEncryptMethod, PhysicalTableMapping, Topic, VirtualObject, \
	VirtualObjectAttribute, VirtualOntology
from watchmen_model.common import TenantId, TopicId
from watchmen_model.dqc import MonitorRule, MonitorRuleGrade

from ..model.governance import (
	GovernanceAttribute,
	GovernanceMonitorRule,
	GovernanceObject,
	GovernancePiiTerm,
	OntologyGovernanceMap,
)
from .factor_mask_policy import is_sensitive_type
from .factor_type_resolver import FactorTypeResolver

if TYPE_CHECKING:
	# Type annotation only; the reader imports watchmen_meta at module level,
	# which requires a meta storage settings environment (breaks DB-less tests).
	from ..meta.pii_term_meta_reader import PIITermRef

logger = logging.getLogger(__name__)


def _enum_value(value) -> Optional[str]:
	"""Serialize a str-enum (or plain string) to its value; None stays None."""
	if value is None:
		return None
	return value.value if hasattr(value, 'value') else str(value)


class OntologyGovernanceService:
	"""Builds the governance map for one ontology. Request-scoped (topic/rule caches)."""

	def __init__(
			self,
			topic_service,
			monitor_rule_service,
			pii_term_reader,
			principal_service: PrincipalService,
	) -> None:
		self._topic_service = topic_service
		self._monitor_rule_service = monitor_rule_service
		self._pii_term_reader = pii_term_reader
		self._tenant_id = principal_service.get_tenant_id()
		# topicName/topicId -> Optional[Topic]; cache None explicitly to avoid re-querying
		self._topic_cache: Dict[str, Optional[Topic]] = {}
		# topicId -> rules carrying that topicId (TOPIC and FACTOR grades)
		self._rules_by_topic: Dict[str, List[MonitorRule]] = {}
		self._global_rules: Optional[List[MonitorRule]] = None

	@classmethod
	def from_primary_service(cls, primary_service) -> 'OntologyGovernanceService':
		"""Wire real meta services sharing the primary service's storage/transaction."""
		from watchmen_meta.admin import TopicService
		from watchmen_meta.dqc import MonitorRuleService

		from ..meta.pii_term_meta_reader import PIITermReader

		storage = primary_service.storage
		snowflake = primary_service.snowflakeGenerator
		principal = primary_service.principalService
		return cls(
			topic_service=TopicService(storage, snowflake, principal),
			monitor_rule_service=MonitorRuleService(storage, snowflake, principal),
			pii_term_reader=PIITermReader(storage, snowflake, principal),
			principal_service=principal,
		)

	def build_map(self, ontology: VirtualOntology) -> OntologyGovernanceMap:
		pii_index = self._index_pii_terms()
		objects = []
		for virtual_object in (ontology.virtualObjects or []):
			attributes = [
				self._build_attribute(virtual_object, attr, pii_index)
				for attr in (virtual_object.attributes or [])
			]
			objects.append(GovernanceObject(
				objectId=virtual_object.id,
				objectName=virtual_object.name,
				attributes=attributes,
			))
		return OntologyGovernanceMap(ontologyId=ontology.ontologyId, objects=objects)

	# ---- attribute assembly ---------------------------------------------------

	def _build_attribute(
			self,
			virtual_object: VirtualObject,
			attr: VirtualObjectAttribute,
			pii_index: Dict[Tuple[str, str], List[GovernancePiiTerm]],
	) -> GovernanceAttribute:
		topic, factor = self._resolve_factor(virtual_object, attr)

		projected = GovernanceAttribute(
			name=attr.name,
			sourceTable=attr.sourceTable,
			sourceField=attr.sourceField,
		)
		if topic is None or factor is None:
			# unresolvable: nulls / empty lists / false flags, no error
			return projected

		topic_id = str(topic.topicId) if topic.topicId is not None else None
		factor_id = str(factor.factorId) if factor.factorId is not None else None
		encrypt = factor.encrypt
		encrypt_configured = encrypt is not None and encrypt != FactorEncryptMethod.NONE
		sensitive = is_sensitive_type(factor.type)

		projected.topicId = topic_id
		projected.topicName = topic.name
		projected.factorId = factor_id
		projected.factorLabel = factor.label
		projected.factorType = _enum_value(factor.type)
		projected.encrypt = _enum_value(encrypt) if encrypt_configured else None
		projected.sensitiveType = sensitive
		# aligned with security_layer: encrypt configured -> masked by method;
		# sensitive factor type -> masked by the default method of that type
		projected.masked = encrypt_configured or sensitive
		if topic_id is not None and factor_id is not None:
			projected.piiTerms = pii_index.get((topic_id, factor_id), [])
		projected.monitorRules = self._find_monitor_rules(topic_id, factor_id)
		return projected

	# ---- topic/factor resolution (mirrors FactorTypeResolver semantics) -------

	def _resolve_factor(
			self,
			virtual_object: VirtualObject,
			attr: VirtualObjectAttribute,
	) -> Tuple[Optional[Topic], Optional[Factor]]:
		if not attr.sourceField:
			return None, None
		mappings_by_key = FactorTypeResolver._index_mappings(virtual_object)
		mapping = mappings_by_key.get(attr.sourceTable or '') if attr.sourceTable else None
		if mapping is None:
			return None, None
		topic = self._load_topic(mapping)
		if topic is None or not topic.factors:
			return None, None
		factor = next((f for f in topic.factors if f.name == attr.sourceField), None)
		if factor is None:
			return None, None
		return topic, factor

	def _load_topic(self, mapping: PhysicalTableMapping) -> Optional[Topic]:
		# prefer lookup by topicName + tenant (topicId is lost in agent-YAML round-trips)
		if mapping.topicName:
			cache_key = f'name::{mapping.topicName}'
			if cache_key not in self._topic_cache:
				self._topic_cache[cache_key] = self._try_load(
					lambda: self._topic_service.find_by_name_and_tenant(mapping.topicName, self._tenant_id))
			return self._topic_cache[cache_key]
		if mapping.topicId:
			cache_key = f'id::{mapping.topicId}'
			if cache_key not in self._topic_cache:
				self._topic_cache[cache_key] = self._try_load(
					lambda: self._topic_service.find_by_id(mapping.topicId))
			return self._topic_cache[cache_key]
		return None

	@staticmethod
	def _try_load(load) -> Optional[Topic]:
		try:
			return load()
		except Exception:  # noqa: BLE001 - resolution failure must not break the projection
			logger.warning('load topic failed', exc_info=True)
			return None

	# ---- PII term matching ------------------------------------------------------

	def _index_pii_terms(self) -> Dict[Tuple[str, str], List[GovernancePiiTerm]]:
		"""(topicId, factorId) -> term hits; confirmed flag distinguishes manual vs pending matches."""
		index: Dict[Tuple[str, str], List[GovernancePiiTerm]] = {}
		terms: List[PIITermRef] = self._pii_term_reader.find_all_for_tenant(self._tenant_id)
		for term in (terms or []):
			for linked in (term.linkedFactors or []):
				if linked.topicId is None or linked.factorId is None:
					continue
				key = (str(linked.topicId), str(linked.factorId))
				index.setdefault(key, []).append(GovernancePiiTerm(
					termId=term.termId,
					name=term.name,
					category=term.category,
					sensitivityLevel=term.sensitivityLevel,
					confirmed=bool(linked.confirmed),
				))
		return index

	# ---- monitor rule matching --------------------------------------------------

	def _find_monitor_rules(
			self,
			topic_id: Optional[str],
			factor_id: Optional[str],
	) -> List[GovernanceMonitorRule]:
		hits: List[GovernanceMonitorRule] = []
		seen = set()

		def collect(rule: MonitorRule) -> None:
			rule_key = str(rule.ruleId)
			if rule_key in seen:
				return
			seen.add(rule_key)
			hits.append(GovernanceMonitorRule(
				ruleId=rule.ruleId,
				code=_enum_value(rule.code),
				grade=_enum_value(rule.grade),
				severity=_enum_value(rule.severity),
				enabled=bool(rule.enabled),
				params=rule.params.model_dump(mode='json', by_alias=True, exclude_none=True)
				if rule.params is not None else None,
			))

		# GLOBAL grade rules apply to every attribute
		for rule in self._load_global_rules():
			collect(rule)
		if topic_id is not None:
			for rule in self._load_topic_rules(topic_id):
				if rule.grade == MonitorRuleGrade.FACTOR:
					# FACTOR grade: only the exact factor matches
					if factor_id is not None and rule.factorId is not None \
							and str(rule.factorId) == factor_id:
						collect(rule)
				else:
					# TOPIC grade (or legacy rows without grade): topicId match is enough
					collect(rule)
		return hits

	def _load_global_rules(self) -> List[MonitorRule]:
		if self._global_rules is None:
			self._global_rules = self._monitor_rule_service.find_by_grade_or_topic_id(
				MonitorRuleGrade.GLOBAL, None, self._tenant_id)
		return self._global_rules

	def _load_topic_rules(self, topic_id: TopicId) -> List[MonitorRule]:
		if topic_id not in self._rules_by_topic:
			self._rules_by_topic[topic_id] = self._monitor_rule_service.find_by_topic_id(topic_id, self._tenant_id)
		return self._rules_by_topic[topic_id]
