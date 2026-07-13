"""TupleService + shaper for :class:`PIIClassificationTerm`.

Mirrors ``watchmen-meta/.../dqc/catalog_service.py`` exactly: an
``EntityShaper`` subclass serializes the tuple to/from an ``EntityRow``, a
``TupleService`` subclass wires the shaper up to the shared storage. The three
list-shaped fields (``linkedFactors``, ``factorTypePatterns``,
``keywordPatterns``) are JSON-serialized into single text columns.
"""
import json
from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import (
	ColumnNameLiteral,
	EntityCriteriaExpression,
	EntityCriteriaOperator,
	EntityRow,
	EntityShaper,
)

from watchmen_pii.model import (
	LinkedFactor,
	PIIClassificationTerm,
	PIITermId,
)

PII_TERM_ENTITY_NAME = 'pii_classification_terms'


def _dump_json(value) -> str:
	"""JSON-encode helper that tolerates ExtendedBaseModel instances."""
	if value is None:
		return '[]'
	try:
		# ExtendedBaseModel exposes to_dict(); plain dicts go straight through.
		if isinstance(value, list) and value and hasattr(value[0], 'to_dict'):
			value = [item.to_dict() if hasattr(item, 'to_dict') else item for item in value]
		return json.dumps(value, ensure_ascii=False)
	except (TypeError, ValueError):
		return '[]'


def _load_linked_factors(raw: Optional[str]) -> List[LinkedFactor]:
	if not raw:
		return []
	try:
		data = json.loads(raw)
	except (TypeError, ValueError):
		return []
	if not isinstance(data, list):
		return []
	return [LinkedFactor(**item) for item in data]


def _load_str_list(raw: Optional[str]) -> List[str]:
	if not raw:
		return []
	try:
		data = json.loads(raw)
	except (TypeError, ValueError):
		return []
	return [str(item) for item in data] if isinstance(data, list) else []


class PIITermShaper(EntityShaper):
	"""Serialize/deserialize a PIIClassificationTerm row."""

	def serialize(self, term: PIIClassificationTerm) -> EntityRow:
		return TupleShaper.serialize_tenant_based(term, {
			'term_id': term.termId,
			'name': term.name,
			'description': term.description,
			'category': term.category,
			'sensitivity_level': term.sensitivityLevel,
			'data_level': term.dataLevel,
			'owner_department': term.ownerDepartment,
			'match_strategy': term.matchStrategy,
			'factor_type_patterns': _dump_json(term.factorTypePatterns),
			'keyword_patterns': _dump_json(term.keywordPatterns),
			'linked_factors': _dump_json(term.linkedFactors),
			'version': term.version,
		})

	def deserialize(self, row: EntityRow) -> PIIClassificationTerm:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, PIIClassificationTerm(
			termId=row.get('term_id'),
			name=row.get('name'),
			description=row.get('description'),
			category=row.get('category'),
			sensitivityLevel=row.get('sensitivity_level'),
			dataLevel=row.get('data_level'),
			ownerDepartment=row.get('owner_department'),
			matchStrategy=row.get('match_strategy'),
			factorTypePatterns=_load_str_list(row.get('factor_type_patterns')),
			keywordPatterns=_load_str_list(row.get('keyword_patterns')),
			linkedFactors=_load_linked_factors(row.get('linked_factors')),
			version=row.get('version'),
		))


PII_TERM_ENTITY_SHAPER = PIITermShaper()


class PIITermService(TupleService):
	"""CRUD service for PII terms."""

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return PII_TERM_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return PII_TERM_ENTITY_SHAPER

	def get_storable_id(self, storable: PIIClassificationTerm) -> PIITermId:
		return storable.termId

	def set_storable_id(self, storable: PIIClassificationTerm, storable_id: PIITermId) -> PIIClassificationTerm:
		storable.termId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'term_id'

	# ---- custom finders -------------------------------------------------

	def find_all_for_tenant(self, tenant_id: TenantId) -> List[PIIClassificationTerm]:
		criteria = []
		if tenant_id:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_by_name(
			self, name: str, tenant_id: TenantId, exact: bool = True
	) -> List[PIIClassificationTerm]:
		criteria = [EntityCriteriaExpression(
			left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)]
		if exact:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), right=name))
		else:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'),
				operator=EntityCriteriaOperator.LIKE, right=name))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
