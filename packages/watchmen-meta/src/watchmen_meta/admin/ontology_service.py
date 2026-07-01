from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.admin import VirtualOntology, OntologySensitivity
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_storage import (
	ColumnNameLiteral, EntityCriteriaExpression, EntityFinder, EntityRow,
	EntityShaper, SnowflakeGenerator, TransactionalStorageSPI
)
from watchmen_utilities import ArrayHelper, is_not_blank


ONTOLOGY_ENTITY_NAME = 'virtual_ontologies'


class OntologyShaper(EntityShaper):
	def serialize(self, ontology: VirtualOntology) -> EntityRow:
		sensitivity = ontology.sensitivity
		if isinstance(sensitivity, OntologySensitivity):
			sensitivity_value = sensitivity.value
		elif sensitivity is not None:
			sensitivity_value = str(sensitivity)
		else:
			sensitivity_value = 'internal'
		return TupleShaper.serialize_tenant_based(ontology, {
			'ontology_id': ontology.ontologyId,
			'name': ontology.name,
			'description': ontology.description,
			'owner': ontology.owner,
			'technical_owner': ontology.technicalOwner,
			'tags': ontology.tags,
			'sensitivity': sensitivity_value,
			# datasourceId 由各 VirtualObject.datasourceId 自行保存，写入 virtual_objects JSON。
			'virtual_objects': ArrayHelper(ontology.virtualObjects).map(lambda x: x.dict()).to_list(),
			'virtual_links': ArrayHelper(ontology.virtualLinks).map(lambda x: x.dict()).to_list(),
		})

	def deserialize(self, row: EntityRow) -> VirtualOntology:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, VirtualOntology(
			ontologyId=row.get('ontology_id'),
			name=row.get('name'),
			description=row.get('description'),
			owner=row.get('owner'),
			technicalOwner=row.get('technical_owner'),
			tags=row.get('tags'),
			sensitivity=row.get('sensitivity'),
			virtualObjects=row.get('virtual_objects'),
			virtualLinks=row.get('virtual_links'),
		))


ONTOLOGY_ENTITY_SHAPER = OntologyShaper()


class OntologyService(TupleService):
	def __init__(
		self,
		storage: TransactionalStorageSPI,
		snowflake_generator: SnowflakeGenerator,
		principal_service: PrincipalService
	):
		super().__init__(storage, snowflake_generator, principal_service)

	def get_entity_name(self) -> str:
		return ONTOLOGY_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return ONTOLOGY_ENTITY_SHAPER

	def get_storable_id_column_name(self) -> str:
		return 'ontology_id'

	def get_storable_id(self, storable: VirtualOntology) -> str:
		return storable.ontologyId

	def set_storable_id(self, storable: VirtualOntology, storable_id: str) -> VirtualOntology:
		storable.ontologyId = storable_id
		return storable

	def should_record_operation(self) -> bool:
		return True

	# ---- query helpers ----

	def find_by_name(self, name: str, tenant_id: TenantId) -> Optional[VirtualOntology]:
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='name'), right=name),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
		]))

	def find_all(self, tenant_id: Optional[TenantId] = None) -> List[VirtualOntology]:
		criteria = []
		if is_not_blank(tenant_id):
			criteria.append(
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria))

	def find_page_by_text(
		self, text: Optional[str], tenant_id: Optional[TenantId], pageable: Pageable
	) -> DataPage:
		criteria = []
		if is_not_blank(text):
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator='like', right=text))
		if is_not_blank(tenant_id):
			criteria.append(
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable))
