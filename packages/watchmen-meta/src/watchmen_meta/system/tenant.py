from typing import Optional

from watchmen_meta.common import TupleService
from watchmen_model.common import DataPage
from watchmen_storage import Entity, EntityShaper
from watchmen_storage.storage_types import EntityRow


class TenantShaper(EntityShaper):
	def serialize(self, entity: Entity) -> EntityRow:
		pass

	def deserialize(self, row: EntityRow) -> Entity:
		pass


TENANT_ENTITY_NAME = 'tenants'
TENANT_ENTITY_SHAPER = TenantShaper()


class TenantService(TupleService):
	def get_entity_name(self) -> str:
		return TENANT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return TENANT_ENTITY_SHAPER

	def find_tenant_by_text(self, text: Optional[str]) -> DataPage:
		pass
