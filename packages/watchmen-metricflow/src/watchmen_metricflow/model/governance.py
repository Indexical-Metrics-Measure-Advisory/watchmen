"""Response models for the ontology governance map projection.

Contract agreed with the frontend: one entry per virtual object, one entry per
attribute (derivedAttributes excluded, they have no direct factor mapping).
Attributes that cannot be resolved to a Topic/Factor keep null topic/factor
fields, empty piiTerms/monitorRules and false sensitiveType/masked -- the
projection never fails on unresolvable attributes.
"""
from typing import Any, Dict, List, Optional

from watchmen_utilities import ExtendedBaseModel


class GovernancePiiTerm(ExtendedBaseModel):
	"""One PII classification term hit on an attribute's underlying factor."""
	termId: Optional[str] = None
	name: Optional[str] = None
	category: Optional[str] = None
	sensitivityLevel: Optional[str] = None
	# confirmed=True means the linked factor was manually confirmed;
	# False means a pending (auto-discovered) match
	confirmed: bool = False


class GovernanceMonitorRule(ExtendedBaseModel):
	"""One DQC monitor rule associated with an attribute (GLOBAL / TOPIC / FACTOR grade)."""
	ruleId: Optional[str] = None
	code: Optional[str] = None
	grade: Optional[str] = None
	severity: Optional[str] = None
	enabled: bool = False
	# rule parameters (min/max/regexp/coverageRate etc.), null when not set
	params: Optional[Dict[str, Any]] = None


class GovernanceAttribute(ExtendedBaseModel):
	"""Governance projection of a single virtual object attribute."""
	name: Optional[str] = None
	sourceTable: Optional[str] = None
	sourceField: Optional[str] = None
	topicId: Optional[str] = None
	topicName: Optional[str] = None
	factorId: Optional[str] = None
	factorLabel: Optional[str] = None
	factorType: Optional[str] = None
	# FactorEncryptMethod value when configured (and not NONE), otherwise null
	encrypt: Optional[str] = None
	# True when the factor type is in the sensitive FactorType set
	sensitiveType: bool = False
	# True when query-time masking rules would mask this attribute
	# (encrypt configured, or sensitive factor type)
	masked: bool = False
	piiTerms: List[GovernancePiiTerm] = []
	monitorRules: List[GovernanceMonitorRule] = []


class GovernanceObject(ExtendedBaseModel):
	"""Governance projection of a single virtual object."""
	objectId: Optional[str] = None
	objectName: Optional[str] = None
	attributes: List[GovernanceAttribute] = []


class OntologyGovernanceMap(ExtendedBaseModel):
	"""Root response of GET /ontology/governance/map."""
	ontologyId: Optional[str] = None
	objects: List[GovernanceObject] = []
