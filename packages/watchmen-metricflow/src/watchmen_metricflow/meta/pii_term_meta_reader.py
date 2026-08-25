"""Read-only reader for PII classification terms.

watchmen-metricflow must not depend on watchmen-pii-classification, so this
module mirrors the column mapping of
``watchmen_pii.meta.pii_term_meta_service.PIITermShaper`` and deserializes only
the fields the governance map needs (term identity + linked factors). The
``pii_classification_terms`` table definition is registered platform-wide in
watchmen-storage-rds table_defs, so plain entity queries work.
"""
import json
from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper
from watchmen_utilities import ExtendedBaseModel

PII_TERM_ENTITY_NAME = 'pii_classification_terms'


class LinkedFactorRef(ExtendedBaseModel):
	"""Minimal mirror of watchmen_pii LinkedFactor (governance map fields only)."""
	topicId: Optional[str] = None
	factorId: Optional[str] = None
	factorName: Optional[str] = None
	matchSource: Optional[str] = None
	confirmed: bool = False


class PIITermRef(ExtendedBaseModel):
	"""Minimal mirror of watchmen_pii PIIClassificationTerm (governance map fields only)."""
	termId: Optional[str] = None
	name: Optional[str] = None
	category: Optional[str] = None
	sensitivityLevel: Optional[str] = None
	linkedFactors: List[LinkedFactorRef] = []


def _load_linked_factors(raw: Optional[str]) -> List[LinkedFactorRef]:
	if not raw:
		return []
	try:
		data = json.loads(raw)
	except (TypeError, ValueError):
		return []
	if not isinstance(data, list):
		return []
	refs = []
	for item in data:
		if not isinstance(item, dict):
			continue
		try:
			refs.append(LinkedFactorRef(**item))
		except (TypeError, ValueError):
			# tolerate unexpected shapes in legacy rows
			continue
	return refs


class PIITermReaderShaper(EntityShaper):
	"""Deserialize-only shaper for pii_classification_terms rows."""

	def serialize(self, storable: PIITermRef) -> EntityRow:
		raise NotImplementedError('PIITermReader is read-only.')

	def deserialize(self, row: EntityRow) -> PIITermRef:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, PIITermRef(
			termId=row.get('term_id'),
			name=row.get('name'),
			category=row.get('category'),
			sensitivityLevel=row.get('sensitivity_level'),
			linkedFactors=_load_linked_factors(row.get('linked_factors')),
		))


PII_TERM_READER_SHAPER = PIITermReaderShaper()


class PIITermReader(TupleService):
	"""Read-only access to PII classification terms, sharing the caller's storage/transaction."""

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return PII_TERM_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return PII_TERM_READER_SHAPER

	def get_storable_id(self, storable: PIITermRef) -> str:
		return storable.termId

	def set_storable_id(self, storable: PIITermRef, storable_id: str) -> PIITermRef:
		storable.termId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'term_id'

	def find_all_for_tenant(self, tenant_id: TenantId) -> List[PIITermRef]:
		criteria = []
		if tenant_id:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))
