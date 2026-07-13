"""PII classification term data models.

Models the user-defined "sensitive concept" (e.g. "保费", "证件号码") and its
linked factors, as specified in section 5 of the PII classification design
document. The inheritance chain — ``ExtendedBaseModel, TenantBasedTuple,
OptimisticLock`` — matches every other tenant-scoped Tuple in the project
(``Topic``, ``Space``, ``Catalog`` ...).
"""
from typing import Any, List, Optional, TypeVar

from watchmen_model.common import TenantBasedTuple, OptimisticLock
from watchmen_utilities import ExtendedBaseModel

# Identifier type alias, mirroring TopicId / CatalogId etc. Defined locally so
# this package does not have to edit watchmen-model's shared id module.
PIITermId = TypeVar('PIITermId', bound=str)

#: One of the predefined PII categories.
PII_CATEGORY_CUSTOMER = '客户数据'
PII_CATEGORY_BUSINESS = '业务数据'
PII_CATEGORY_OPERATION = '经营管理数据'
PII_CATEGORY_REGULATORY = '监管数据'

#: Sensitivity levels.
SENSITIVITY_LEVEL_1 = '1级'
SENSITIVITY_LEVEL_2 = '2级'

#: Match strategies.
MATCH_STRATEGY_LOGIC = 'logic'
MATCH_STRATEGY_AI = 'ai'
MATCH_STRATEGY_LOGIC_AND_AI = 'logic+ai'

#: Match sources (where a LinkedFactor hit came from).
MATCH_SOURCE_TYPE = 'type'
MATCH_SOURCE_KEYWORD = 'keyword'
MATCH_SOURCE_AI = 'ai'


class LinkedFactor(ExtendedBaseModel):
	"""A Factor that a term has been associated with (via logic or AI)."""

	topicId: str
	topicName: Optional[str] = None
	factorId: str
	factorName: Optional[str] = None
	factorLabel: Optional[str] = None
	factorType: Optional[str] = None
	matchConfidence: float = 0.0
	matchSource: str = MATCH_SOURCE_TYPE
	confirmed: bool = False

	@property
	def key(self) -> str:
		"""Stable de-duplication key (topicId|factorId)."""
		return f"{self.topicId}|{self.factorId}"


class PIIClassificationTerm(ExtendedBaseModel, TenantBasedTuple, OptimisticLock):
	"""A user-defined sensitive business concept.

	The term is the basic unit of PII classification. ``matchStrategy`` and the
	``*Patterns`` fields drive the Factor discovery engine; ``linkedFactors``
	holds the (possibly unconfirmed) matches produced by that engine.
	"""

	termId: Optional[PIITermId] = None
	name: str
	description: Optional[str] = None
	category: Optional[str] = None
	sensitivityLevel: Optional[str] = None
	dataLevel: Optional[str] = None
	ownerDepartment: Optional[str] = None
	matchStrategy: Optional[str] = MATCH_STRATEGY_LOGIC
	factorTypePatterns: Optional[List[str]] = []
	keywordPatterns: Optional[List[str]] = []
	linkedFactors: Optional[List[LinkedFactor]] = []


class PIITermUpsert(PIIClassificationTerm):
	"""Request payload for term create/update, following the project's
	``*Upsert`` convention (cf. ``GlossaryUpsert``)."""
