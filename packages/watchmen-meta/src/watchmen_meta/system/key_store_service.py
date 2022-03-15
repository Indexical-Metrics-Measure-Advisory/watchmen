from typing import Optional

from watchmen_meta.common import StorageService
from watchmen_model.common import TenantId
from watchmen_model.system import KeyStore
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityFinder, EntityRow, EntityShaper


class KeyStoreShaper(EntityShaper):
	def serialize(self, key_store: KeyStore) -> EntityRow:
		return {
			'tenant_id': key_store.tenantId,
			'key_type': key_store.keyType,
			'params': key_store.params,
			'created_at': key_store.createdAt,
			'created_by': key_store.createdBy
		}

	def deserialize(self, row: EntityRow) -> KeyStore:
		return KeyStore(
			tenantId=row.get('tenant_id'),
			keyType=row.get('key_type'),
			params=row.get('params'),
			createdAt=row.get('created_at'),
			createdBy=row.get('created_by')
		)


KEY_STORE_ENTITY_NAME = 'key_stores'
KEY_STORE_ENTITY_SHAPER = KeyStoreShaper()


class KeyStoreService(StorageService):
	# noinspection PyMethodMayBeStatic
	def get_entity_name(self) -> str:
		return KEY_STORE_ENTITY_NAME

	# noinspection PyMethodMayBeStatic
	def get_entity_shaper(self) -> EntityShaper:
		return KEY_STORE_ENTITY_SHAPER

	def find_by_type(self, key_type: str, tenant_id: TenantId) -> Optional[KeyStore]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(
					left=ColumnNameLiteral(columnName='key_type'), right=key_type),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))
