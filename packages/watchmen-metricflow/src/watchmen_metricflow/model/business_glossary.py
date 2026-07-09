from enum import Enum
from typing import List, Optional

from watchmen_model.common import TenantBasedTuple
from watchmen_utilities import ExtendedBaseModel


# ============================================================================
# Enums
# ============================================================================

class GlossaryStatus(str, Enum):
	ACTIVE = 'active'
	DEPRECATED = 'deprecated'
	DRAFT = 'draft'


class TermStatus(str, Enum):
	ACTIVE = 'active'
	DEPRECATED = 'deprecated'
	DRAFT = 'draft'


class EntityType(str, Enum):
	TOPIC = 'topic'
	ONTOLOGY = 'ontology'
	FACTOR = 'factor'
	SEMANTIC_MODEL = 'semantic_model'


class TermRelationType(str, Enum):
	SYNONYM = 'synonym'
	RELATED = 'related'
	ANTONYM = 'antonym'
	IS_A = 'is_a'


# ============================================================================
# Glossary (术语表)
# ============================================================================

class Glossary(ExtendedBaseModel, TenantBasedTuple):
	id: str = None
	name: str = None
	display_name: str = None
	description: Optional[str] = None
	language: Optional[str] = None
	status: GlossaryStatus = None
	owner: Optional[str] = None
	tags: Optional[List[str]] = None


# ============================================================================
# Category (分类)
# ============================================================================

class Category(ExtendedBaseModel):
	id: str = None
	name: str = None
	qualified_name: str = None
	description: Optional[str] = None
	parent_category_id: Optional[str] = None
	glossary_id: Optional[str] = None
	order_index: int = 0


# ============================================================================
# Term Entity Assignment (术语-资产关联)
# ============================================================================

class TermEntityAssignment(ExtendedBaseModel):
	entity_type: str = None
	entity_id: str = None
	entity_name: Optional[str] = None
	relation_guid: str = None
	confidence: float = 1.0


# ============================================================================
# Term (业务术语)
# ============================================================================

class Term(ExtendedBaseModel):
	id: str = None
	name: str = None
	qualified_name: str = None
	display_name: Optional[str] = None
	description: Optional[str] = None
	short_description: Optional[str] = None
	abbreviation: Optional[str] = None
	examples: Optional[List[str]] = None
	status: TermStatus = None
	glossary_id: Optional[str] = None
	category_ids: List[str] = []
	# term relations
	synonyms: List[str] = []
	related_terms: List[str] = []
	antonyms: List[str] = []
	is_a: List[str] = []
	# entity assignments
	assigned_entities: List[TermEntityAssignment] = []
	# governance
	owner: Optional[str] = None
	steward: Optional[str] = None
	source_url: Optional[str] = None


# ============================================================================
# Bundle (聚合根)
# ============================================================================

class GlossaryBundle(ExtendedBaseModel):
	glossary: Glossary
	categories: List[Category] = []
	terms: List[Term] = []


# ============================================================================
# Upsert payloads
# ============================================================================

class GlossaryUpsert(ExtendedBaseModel, TenantBasedTuple):
	"""Payload for create/update of a Glossary."""
	name: str = None
	display_name: Optional[str] = None
	description: Optional[str] = None
	language: Optional[str] = None
	status: GlossaryStatus = None
	owner: Optional[str] = None
	tags: Optional[List[str]] = None


class CategoryUpsert(ExtendedBaseModel):
	"""Payload for create/update of a Category."""
	id: Optional[str] = None
	name: str = None
	description: Optional[str] = None
	parent_category_id: Optional[str] = None
	order_index: int = 0


class TermUpsert(ExtendedBaseModel):
	"""Payload for create/update of a Term."""
	id: Optional[str] = None
	name: str = None
	display_name: Optional[str] = None
	description: Optional[str] = None
	short_description: Optional[str] = None
	abbreviation: Optional[str] = None
	examples: Optional[List[str]] = None
	status: TermStatus = None
	category_ids: List[str] = []
	synonyms: List[str] = []
	related_terms: List[str] = []
	antonyms: List[str] = []
	is_a: List[str] = []
	owner: Optional[str] = None
	steward: Optional[str] = None
	source_url: Optional[str] = None


class TermEntityAssignmentUpsert(ExtendedBaseModel):
	"""Payload for assigning/removing an entity to/from a term."""
	entity_type: str = None
	entity_id: str = None
	entity_name: Optional[str] = None
	confidence: float = 1.0


class TermRelationUpsert(ExtendedBaseModel):
	"""Payload for adding/removing a term relation."""
	relation_type: TermRelationType = None
	target_term_id: str = None


class TermDeleteRequest(ExtendedBaseModel):
	term_id: str = None


class CategoryDeleteRequest(ExtendedBaseModel):
	category_id: str = None
