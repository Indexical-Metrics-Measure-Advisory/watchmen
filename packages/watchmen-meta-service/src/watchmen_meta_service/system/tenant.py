from typing import Optional

from watchmen_meta_service.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_model.system import Tenant
from watchmen_storage import EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, EntityShaper


class TenantShaper(EntityShaper):
	def serialize(self, tenant: Tenant) -> EntityRow:
		return TupleShaper.serialize(tenant, {
			'tenant_id': tenant.tenantId,
			'name': tenant.name
		})

	def deserialize(self, row: EntityRow) -> Tenant:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize(row, Tenant(
			tenantId=row.get('tenant_id'),
			name=row.get('name')
		))


TENANT_ENTITY_NAME = 'tenants'
TENANT_ENTITY_SHAPER = TenantShaper()


class TenantService(TupleService):
	def get_entity_name(self) -> str:
		return TENANT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TENANT_ENTITY_SHAPER

	def get_tuple_id(self, a_tuple: Tenant) -> TenantId:
		return a_tuple.tenantId

	def set_tuple_id(self, a_tuple: Tenant, tuple_id: TenantId) -> Tenant:
		a_tuple.tenantId = tuple_id
		return a_tuple

	def get_tuple_id_column_name(self) -> str:
		return 'tenant_id'

	def find_tenants_by_text(self, text: Optional[str], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(name='name', operator=EntityCriteriaOperator.LIKE, value=text))
		return self.storage.page(self.get_entity_pager(criteria, pageable))
