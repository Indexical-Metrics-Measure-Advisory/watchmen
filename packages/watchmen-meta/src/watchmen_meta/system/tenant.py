from typing import Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, TenantId
from watchmen_model.system import Tenant
from watchmen_storage import EntityRow, EntityShaper


class TenantShaper(EntityShaper):
	def serialize(self, tenant: Tenant) -> EntityRow:
		return TupleShaper.serialize(tenant, {
			'tenant_id': tenant.tenantId,
			'name': tenant.name
		})

	def deserialize(self, row: EntityRow) -> Tenant:
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

	def find_tenant_by_text(self, text: Optional[str]) -> DataPage:
		# TODO
		pass
