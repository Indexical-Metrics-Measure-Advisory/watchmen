from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import TenantId
from watchmen_storage import EntityShaper, EntityRow, EntityCriteriaExpression, ColumnNameLiteral
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank

from ..model.business_glossary import (
	Glossary, GlossaryBundle, Category, Term,
	TermEntityAssignment, TermRelationType
)


# ============================================================================
# Shapers
# ============================================================================

class GlossaryShaper(EntityShaper):
	"""Serialize/deserialize Glossary (metadata only, no categories/terms)."""

	def serialize(self, entity: Glossary) -> EntityRow:
		row: EntityRow = TupleShaper.serialize_tenant_based(entity, {
			'standard_id': entity.id,
			'name': entity.name,
			'display_name': entity.display_name,
			'description': entity.description,
			'language': entity.language,
			'status': entity.status.value if entity.status else None,
			'owner': entity.owner,
			'tags': entity.tags,
		})
		return row

	def deserialize(self, row: EntityRow) -> Glossary:
		return TupleShaper.deserialize_tenant_based(row, Glossary(
			id=row.get('standard_id'),
			name=row.get('name'),
			display_name=row.get('display_name'),
			description=row.get('description'),
			language=row.get('language'),
			status=row.get('status'),
			owner=row.get('owner'),
			tags=row.get('tags') or []
		))


class GlossaryBundleShaper(EntityShaper):
	"""Serialize/deserialize GlossaryBundle (glossary + categories + terms as JSON columns)."""

	def __init__(self) -> None:
		super().__init__()
		self.glossary_shaper = GlossaryShaper()

	def serialize(self, entity: GlossaryBundle) -> EntityRow:
		row = self.glossary_shaper.serialize(entity.glossary)
		row['categories'] = GlossaryBundleShaper._serialize_list(entity.categories)
		row['terms'] = GlossaryBundleShaper._serialize_list(entity.terms)
		return row

	def deserialize(self, row: EntityRow) -> GlossaryBundle:
		glossary = self.glossary_shaper.deserialize(row)
		categories = GlossaryBundleShaper._deserialize_categories(row.get('categories'))
		terms = GlossaryBundleShaper._deserialize_terms(row.get('terms'))
		return GlossaryBundle(glossary=glossary, categories=categories, terms=terms)

	@staticmethod
	def _serialize_list(items: Optional[list]) -> list:
		if items is None:
			return []
		if isinstance(items, list):
			return [item.model_dump() if hasattr(item, 'model_dump') else item for item in items]
		return []

	@staticmethod
	def _deserialize_categories(value) -> List[Category]:
		if value is None:
			return []
		if isinstance(value, list):
			try:
				return [Category.model_validate(v) if isinstance(v, dict) else v for v in value]
			except Exception:
				return []
		return []

	@staticmethod
	def _deserialize_terms(value) -> List[Term]:
		if value is None:
			return []
		if isinstance(value, list):
			try:
				return [Term.model_validate(v) if isinstance(v, dict) else v for v in value]
			except Exception:
				return []
		return []


GLOSSARY_ENTITY_NAME = 'business_glossary'
GLOSSARY_SHAPER = GlossaryShaper()
BUNDLE_SHAPER = GlossaryBundleShaper()


# ============================================================================
# Service
# ============================================================================

class GlossaryService(TupleService):
	"""
	TupleService over the business_glossary table.
	Each row represents a GlossaryBundle (glossary metadata + categories + terms as JSON).
	"""

	def __init__(self, storage, snowflake_generator, principal_service):
		super().__init__(storage, snowflake_generator, principal_service)

	def should_record_operation(self) -> bool:
		return True

	def get_entity_name(self) -> str:
		return GLOSSARY_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return GLOSSARY_SHAPER

	def get_storable_id(self, storable: Glossary) -> str:
		return storable.id

	def set_storable_id(self, storable: Glossary, storable_id: str) -> Glossary:
		storable.id = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'standard_id'

	# ---- Bundle-level ----

	def list_bundles(self) -> List[GlossaryBundle]:
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		rows: List[EntityRow] = self.storage.find(self.get_entity_finder(criteria))
		return ArrayHelper(rows).map(lambda r: BUNDLE_SHAPER.deserialize(r)).to_list()

	def find_bundle(self, glossary_id: str) -> Optional[GlossaryBundle]:
		if is_blank(glossary_id):
			return None
		row = self._find_row(glossary_id)
		if row is None:
			return None
		return BUNDLE_SHAPER.deserialize(row)

	def find_bundle_by_name(self, name: str) -> Optional[GlossaryBundle]:
		if is_blank(name):
			return None
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		rows: List[EntityRow] = self.storage.find(self.get_entity_finder(criteria))
		if not rows:
			return None
		return BUNDLE_SHAPER.deserialize(rows[0])

	def create_bundle(self, bundle: GlossaryBundle) -> GlossaryBundle:
		if is_blank(bundle.glossary.id):
			bundle.glossary.id = str(self.snowflakeGenerator.next_id())
		self.storage.insert_one(self.get_entity_writer(BUNDLE_SHAPER.serialize(bundle)))
		return bundle

	def update_glossary(self, glossary: Glossary) -> Glossary:
		row = self._find_row(glossary.id)
		if row is None:
			return glossary
		row['name'] = glossary.name
		row['display_name'] = glossary.display_name
		row['description'] = glossary.description
		row['language'] = glossary.language
		row['status'] = glossary.status.value if glossary.status else None
		row['owner'] = glossary.owner
		row['tags'] = glossary.tags
		self.storage.update_one(self.get_entity_updater(row['standard_id'], row))
		return glossary

	def delete_bundle(self, glossary_id: str) -> None:
		if is_blank(glossary_id):
			return
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='standard_id'), right=glossary_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		self.storage.delete(self.get_entity_deleter(criteria=criteria))

	def replace_bundle(self, bundle: GlossaryBundle) -> GlossaryBundle:
		"""Replace the entire bundle (glossary + all categories + all terms) in storage."""
		row = self._find_row(bundle.glossary.id)
		if row is None:
			raise ValueError(f'Glossary not found: {bundle.glossary.id}')
		serialized = BUNDLE_SHAPER.serialize(bundle)
		row.update(serialized)
		self.storage.update_one(self.get_entity_updater(row['standard_id'], row))
		return bundle

	# ---- Category CRUD ----

	def append_category(self, glossary_id: str, category: Category) -> Category:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		if is_blank(category.id):
			category.id = str(self.snowflakeGenerator.next_id())
		category.glossary_id = glossary_id
		category.qualified_name = self._build_category_qualified_name(category, bundle)
		categories = bundle.categories or []
		categories = [c for c in categories if c.id != category.id]
		categories.append(category)
		bundle.categories = categories
		self._save_categories_and_terms(glossary_id, bundle)
		return category

	def update_category(self, glossary_id: str, category: Category) -> Category:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		category.glossary_id = glossary_id
		category.qualified_name = self._build_category_qualified_name(category, bundle)
		categories = bundle.categories or []
		replaced = False
		for idx, existing in enumerate(categories):
			if existing.id == category.id:
				categories[idx] = category
				replaced = True
				break
		if not replaced:
			raise ValueError(f'Category not found: {category.id}')
		bundle.categories = categories
		self._save_categories_and_terms(glossary_id, bundle)
		return category

	def delete_category(self, glossary_id: str, category_id: str) -> None:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		categories = bundle.categories or []
		bundle.categories = [c for c in categories if c.id != category_id]
		self._save_categories_and_terms(glossary_id, bundle)

	# ---- Term CRUD ----

	def append_term(self, glossary_id: str, term: Term) -> Term:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		if is_blank(term.id):
			term.id = str(self.snowflakeGenerator.next_id())
		term.glossary_id = glossary_id
		term.qualified_name = f'{term.name}@{bundle.glossary.name}'
		terms = bundle.terms or []
		terms = [t for t in terms if t.id != term.id]
		terms.append(term)
		bundle.terms = terms
		self._save_categories_and_terms(glossary_id, bundle)
		return term

	def update_term(self, glossary_id: str, term: Term) -> Term:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		term.glossary_id = glossary_id
		term.qualified_name = f'{term.name}@{bundle.glossary.name}'
		terms = bundle.terms or []
		replaced = False
		for idx, existing in enumerate(terms):
			if existing.id == term.id:
				terms[idx] = term
				replaced = True
				break
		if not replaced:
			raise ValueError(f'Term not found: {term.id}')
		bundle.terms = terms
		self._save_categories_and_terms(glossary_id, bundle)
		return term

	def delete_term(self, glossary_id: str, term_id: str) -> None:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		terms = bundle.terms or []
		bundle.terms = [t for t in terms if t.id != term_id]
		self._save_categories_and_terms(glossary_id, bundle)

	# ---- Term search ----

	def search_terms(self, glossary_id: str, query: str) -> List[Term]:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			return []
		terms = bundle.terms or []
		if is_blank(query):
			return terms
		q = query.lower()
		return [
			t for t in terms
			if (is_not_blank(t.name) and q in t.name.lower())
			or (is_not_blank(t.display_name) and q in t.display_name.lower())
			or (is_not_blank(t.description) and q in t.description.lower())
			or (is_not_blank(t.short_description) and q in t.short_description.lower())
			or (is_not_blank(t.abbreviation) and q in t.abbreviation.lower())
		]

	def find_term_by_name(self, glossary_id: str, name: str) -> Optional[Term]:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			return None
		for term in (bundle.terms or []):
			if term.name == name:
				return term
		return None

	def find_terms_by_category(self, glossary_id: str, category_id: str) -> List[Term]:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			return []
		return [t for t in (bundle.terms or []) if category_id in (t.category_ids or [])]

	# ---- Term relations ----

	def add_term_relation(self, glossary_id: str, term_id: str, relation_type: TermRelationType, target_term_id: str) -> Term:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		term = self._find_term_in_bundle(bundle, term_id)
		if term is None:
			raise ValueError(f'Term not found: {term_id}')
		# validate target exists
		target = self._find_term_in_bundle(bundle, target_term_id)
		if target is None:
			raise ValueError(f'Target term not found: {target_term_id}')

		relation_field = self._get_relation_field(relation_type)
		relations = getattr(term, relation_field) or []
		if target_term_id not in relations:
			relations.append(target_term_id)
			setattr(term, relation_field, relations)
			# also add reverse relation for symmetric types
			if relation_type == TermRelationType.RELATED:
				reverse_relations = getattr(target, 'related_terms') or []
				if term_id not in reverse_relations:
					reverse_relations.append(term_id)
					target.related_terms = reverse_relations
		self._save_categories_and_terms(glossary_id, bundle)
		return term

	def remove_term_relation(self, glossary_id: str, term_id: str, relation_type: TermRelationType, target_term_id: str) -> Term:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		term = self._find_term_in_bundle(bundle, term_id)
		if term is None:
			raise ValueError(f'Term not found: {term_id}')

		relation_field = self._get_relation_field(relation_type)
		relations = getattr(term, relation_field) or []
		if target_term_id in relations:
			relations.remove(target_term_id)
			setattr(term, relation_field, relations)
		if relation_type == TermRelationType.RELATED:
			target = self._find_term_in_bundle(bundle, target_term_id)
			if target is not None:
				reverse_relations = getattr(target, 'related_terms') or []
				if term_id in reverse_relations:
					reverse_relations.remove(term_id)
					target.related_terms = reverse_relations
		self._save_categories_and_terms(glossary_id, bundle)
		return term

	# ---- Entity assignments ----

	def assign_entity_to_term(self, glossary_id: str, term_id: str, assignment: TermEntityAssignment) -> Term:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		term = self._find_term_in_bundle(bundle, term_id)
		if term is None:
			raise ValueError(f'Term not found: {term_id}')
		if is_blank(assignment.relation_guid):
			assignment.relation_guid = str(self.snowflakeGenerator.next_id())
		assignments = term.assigned_entities or []
		# de-duplicate by entity_type + entity_id
		assignments = [a for a in assignments if not (a.entity_type == assignment.entity_type and a.entity_id == assignment.entity_id)]
		assignments.append(assignment)
		term.assigned_entities = assignments
		self._save_categories_and_terms(glossary_id, bundle)
		return term

	def remove_entity_from_term(self, glossary_id: str, term_id: str, entity_type: str, entity_id: str) -> Term:
		bundle = self.find_bundle(glossary_id)
		if bundle is None:
			raise ValueError(f'Glossary not found: {glossary_id}')
		term = self._find_term_in_bundle(bundle, term_id)
		if term is None:
			raise ValueError(f'Term not found: {term_id}')
		assignments = term.assigned_entities or []
		term.assigned_entities = [a for a in assignments if not (a.entity_type == entity_type and a.entity_id == entity_id)]
		self._save_categories_and_terms(glossary_id, bundle)
		return term

	# ---- Internals ----

	def _find_row(self, glossary_id: str) -> Optional[EntityRow]:
		tenant_id: TenantId = self.principalService.get_tenant_id()
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='standard_id'), right=glossary_id)
		]
		if is_not_blank(tenant_id):
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		rows: List[EntityRow] = self.storage.find(self.get_entity_finder(criteria))
		return rows[0] if rows else None

	def _save_categories_and_terms(self, glossary_id: str, bundle: GlossaryBundle) -> None:
		row = self._find_row(glossary_id)
		if row is None:
			return
		row['categories'] = GlossaryBundleShaper._serialize_list(bundle.categories)
		row['terms'] = GlossaryBundleShaper._serialize_list(bundle.terms)
		self.storage.update_one(self.get_entity_updater(glossary_id, row))

	def _find_term_in_bundle(self, bundle: GlossaryBundle, term_id: str) -> Optional[Term]:
		for term in (bundle.terms or []):
			if term.id == term_id:
				return term
		return None

	@staticmethod
	def _build_category_qualified_name(category: Category, bundle: GlossaryBundle) -> str:
		if is_not_blank(category.parent_category_id):
			parent = next((c for c in (bundle.categories or []) if c.id == category.parent_category_id), None)
			if parent and is_not_blank(parent.qualified_name):
				return f'{category.name}.{parent.qualified_name}'
		return f'{category.name}@{bundle.glossary.name}'

	@staticmethod
	def _get_relation_field(relation_type: TermRelationType) -> str:
		mapping = {
			TermRelationType.SYNONYM: 'synonyms',
			TermRelationType.RELATED: 'related_terms',
			TermRelationType.ANTONYM: 'antonyms',
			TermRelationType.IS_A: 'is_a',
		}
		return mapping[relation_type]


__all__ = [
	'GlossaryService', 'GlossaryShaper', 'GlossaryBundleShaper', 'BUNDLE_SHAPER',
	'GLOSSARY_ENTITY_NAME', 'GLOSSARY_SHAPER',
]
