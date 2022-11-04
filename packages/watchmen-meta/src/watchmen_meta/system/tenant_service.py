from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_model.system import Tenant
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityCriteriaOperator, EntityRow, \
	EntityShaper


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
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return TENANT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TENANT_ENTITY_SHAPER

	def get_storable_id(self, storable: Tenant) -> TenantId:
		return storable.tenantId

	def set_storable_id(self, storable: Tenant, storable_id: TenantId) -> Tenant:
		storable.tenantId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'tenant_id'

	def find_by_text(self, text: Optional[str], pageable: Pageable) -> DataPage:
		criteria = []
		if text is not None and len(text.strip()) != 0:
			criteria.append(EntityCriteriaExpression(
				left=ColumnNameLiteral(columnName='name'), operator=EntityCriteriaOperator.LIKE, right=text))
		return self.storage.page(self.get_entity_pager(criteria, pageable))

	def find_all(self) -> List[Tenant]:
		# noinspection PyTypeChecker
		return self.storage.find_all(self.get_entity_helper())
