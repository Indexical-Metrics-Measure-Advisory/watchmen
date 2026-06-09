from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

from ..model.business_glossary import (
	Standard, StandardBundle, EntryMap, SectionId, EntryRow,
	TableEntry, FieldCodeEntry, CodeValueEntry, TermEntry,
	NamingEntry, DependencyEntry, OverviewEntry, ENTRY_FIELD_BY_SECTION
)


class StandardShaper(EntityShaper):
	@staticmethod
	def serialize_entry_map(entries: Optional[EntryMap]):
		if entries is None:
			return None
		if isinstance(entries, dict):
			return entries
		return entries.model_dump()

	def serialize(self, entity: Standard) -> EntityRow:
		# Build a row that includes tenantId, then pack everything except entries into a separate column.
		row: EntityRow = TupleShaper.serialize_tenant_based(entity, {
			'standard_id': entity.id,
			'abbreviation': entity.abbreviation,
			'name': entity.name,
			'description': entity.description,
			'version': entity.version,
			'status': entity.status.value if entity.status else None,
			'source_url': entity.sourceUrl,
			'tags': entity.tags,
		})
		return row

	def deserialize(self, row: EntityRow) -> Standard:
		return TupleShaper.deserialize_tenant_based(row, Standard(
			id=row.get('standard_id'),
			abbreviation=row.get('abbreviation'),
			name=row.get('name'),
			description=row.get('description'),
			version=row.get('version'),
			status=row.get('status'),
			sourceUrl=row.get('source_url'),
			tags=row.get('tags') or []
		))


class StandardBundleShaper(EntityShaper):
	"""
	StandardBundle is stored as a single row with the entries payload as a JSON column.
	"""

	def __init__(self) -> None:
		super().__init__()
		self.standard_shaper = StandardShaper()

	def serialize(self, entity: StandardBundle) -> EntityRow:
		row = self.standard_shaper.serialize(entity.standard)
		row['entries'] = StandardBundleShaper._serialize_entries(entity.entries)
		return row

	def deserialize(self, row: EntityRow) -> StandardBundle:
		standard = self.standard_shaper.deserialize(row)
		entries = StandardBundleShaper._deserialize_entries(row.get('entries'))
		return StandardBundle(standard=standard, entries=entries)

	@staticmethod
	def _serialize_entries(entries: Optional[EntryMap]):
		if entries is None:
			return {
				'tables': [], 'fields': [], 'codes': [], 'terms': [],
				'naming': [], 'dependencies': [], 'overview': []
			}
		if isinstance(entries, dict):
			return entries
		return entries.model_dump()

	@staticmethod
	def _deserialize_entries(value) -> Optional[EntryMap]:
		if value is None:
			return EntryMap()
		if isinstance(value, EntryMap):
			return value
		try:
			return EntryMap.model_validate(value)
		except Exception:
			return EntryMap()


STANDARD_ENTITY_NAME = 'business_glossary'
STANDARD_SHAPER = StandardShaper()
BUNDLE_SHAPER = StandardBundleShaper()


class StandardService(TupleService):
	"""
	TupleService over the standard table. Each row represents a StandardBundle.
	"""

	def __init__(self, storage, snowflake_generator, principal_service):
		super().__init__()
		self.storage = storage
		self.snowflakeGenerator = snowflake_generator
		self.principalService = principal_service

	def should_record_operation(self) -> bool:
		return True

	def get_entity_name(self) -> str:
		return STANDARD_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return STANDARD_SHAPER

	def get_storable_id(self, storable: Standard) -> str:
		return storable.id

	def set_storable_id(self, storable: Standard, storable_id: str) -> Standard:
		storable.id = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'standard_id'

	# ---- Bundle-level helpers (the service is the public API for the router) ----

	def list_bundles(self) -> List[StandardBundle]:
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		rows: List[EntityRow] = self.storage.find(self.get_entity_finder(criteria))
		return ArrayHelper(rows).map(lambda r: BUNDLE_SHAPER.deserialize(r)).to_list()

	def find_bundle(self, standard_id: str) -> Optional[StandardBundle]:
		if is_blank(standard_id):
			return None
		row = self._find_row(standard_id)
		if row is None:
			return None
		return BUNDLE_SHAPER.deserialize(row)

	def create_bundle(self, bundle: StandardBundle) -> StandardBundle:
		# assign id from snowflake
		bundle.standard.id = str(self.snowflakeGenerator.next_id())
		self.storage.insert_one(self.get_entity_writer(BUNDLE_SHAPER.serialize(bundle)))
		return bundle

	def update_standard(self, standard: Standard) -> Standard:
		row = self._find_row(standard.id)
		if row is None:
			return standard
		# Patch only standard fields, leave entries alone.
		row['abbreviation'] = standard.abbreviation
		row['name'] = standard.name
		row['description'] = standard.description
		row['version'] = standard.version
		row['status'] = standard.status.value if standard.status else None
		row['source_url'] = standard.sourceUrl
		row['tags'] = standard.tags
		self.storage.update_one(self.get_entity_updater(row['standard_id'], row))
		return standard

	def delete_bundle(self, standard_id: str) -> None:
		if is_blank(standard_id):
			return
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='standard_id'), right=standard_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		self.storage.delete(self.get_entity_deleter(criteria=criteria))

	# ---- Entries ----

	def append_entry(self, standard_id: str, section: SectionId, row: EntryRow) -> EntryRow:
		bundle = self.find_bundle(standard_id)
		if bundle is None:
			raise ValueError(f'Standard not found: {standard_id}')
		if row.id is None:
			row.id = str(self.snowflakeGenerator.next_id())
		entries = bundle.entries or EntryMap()
		field = ENTRY_FIELD_BY_SECTION[section]
		current = getattr(entries, field) or []
		# de-duplicate by id
		current = [e for e in current if getattr(e, 'id', None) != row.id]
		current.append(row)
		setattr(entries, field, current)
		bundle.entries = entries
		self._save_entries(standard_id, entries)
		return row

	def update_entry(self, standard_id: str, section: SectionId, row: EntryRow) -> EntryRow:
		bundle = self.find_bundle(standard_id)
		if bundle is None:
			raise ValueError(f'Standard not found: {standard_id}')
		entries = bundle.entries or EntryMap()
		field = ENTRY_FIELD_BY_SECTION[section]
		current = getattr(entries, field) or []
		replaced = False
		for idx, existing in enumerate(current):
			if getattr(existing, 'id', None) == row.id:
				current[idx] = row
				replaced = True
				break
		if not replaced:
			raise ValueError(f'Entry not found: {row.id}')
		setattr(entries, field, current)
		bundle.entries = entries
		self._save_entries(standard_id, entries)
		return row

	def delete_entry(self, standard_id: str, section: SectionId, entry_id: str) -> None:
		bundle = self.find_bundle(standard_id)
		if bundle is None:
			raise ValueError(f'Standard not found: {standard_id}')
		entries = bundle.entries or EntryMap()
		field = ENTRY_FIELD_BY_SECTION[section]
		current = getattr(entries, field) or []
		current = [e for e in current if getattr(e, 'id', None) != entry_id]
		setattr(entries, field, current)
		bundle.entries = entries
		self._save_entries(standard_id, entries)

	# ---- Internals ----

	def _find_row(self, standard_id: str) -> Optional[EntityRow]:
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='standard_id'), right=standard_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		rows: List[EntityRow] = self.storage.find(self.get_entity_finder(criteria))
		return rows[0] if rows else None

	def _save_entries(self, standard_id: str, entries: EntryMap) -> None:
		row = self._find_row(standard_id)
		if row is None:
			return
		row['entries'] = BUNDLE_SHAPER._serialize_entries(entries)
		self.storage.update_one(self.get_entity_updater(standard_id, row))


__all__ = [
	'StandardService', 'StandardShaper', 'StandardBundleShaper', 'BUNDLE_SHAPER',
	'STANDARD_ENTITY_NAME', 'STANDARD_SHAPER',
]
