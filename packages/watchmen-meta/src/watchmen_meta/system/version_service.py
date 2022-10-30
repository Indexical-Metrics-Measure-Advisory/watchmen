
from typing import TypeVar, Optional
from watchmen_meta.common.storage_service import StorableId
from watchmen_model.common import Storable

from watchmen_meta.common import TupleShaper, TupleService
from watchmen_model.system import Version

from watchmen_storage import EntityName, EntityShaper, EntityRow, \
	EntityFinder, EntityCriteriaExpression, ColumnNameLiteral


VersionId = TypeVar('VersionId', bound=str)


class VersionShaper(EntityShaper):
	
	def serialize(self, version: Version) -> EntityRow:
		return TupleShaper.serialize_tenant_based(version, {
			'version_id': version.versionId,
			'previous_version': version.preVersion,
			'current_version': version.currVersion
		})
	
	def deserialize(self, row: EntityRow) -> Version:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, Version(
			versionId=row.get('version_id'),
			preVersion=row.get('previous_version'),
			currVersion=row.get('current_version')
		))


VERSIONS_TABLE = 'versions'
VERSIONS_ENTITY_SHAPER = VersionShaper()


class VersionService(TupleService):
	
	def get_entity_name(self) -> EntityName:
		return VERSIONS_TABLE
	
	def get_entity_shaper(self) -> EntityShaper:
		return VERSIONS_ENTITY_SHAPER
	
	def get_storable_id_column_name(self) -> EntityName:
		return 'version_id'
	
	def get_storable_id(self, storable: Version) -> StorableId:
		return storable.versionId
	
	def set_storable_id(self, storable: Version, storable_id: VersionId) -> Storable:
		storable.versionId = storable_id
		return storable

	def find_by_tenant(self) -> Optional[Version]:
		try:
			self.storage.connect()
			return self.storage.find_one(EntityFinder(
				name=self.get_entity_name(),
				shaper=self.get_entity_shaper(),
				criteria=[
					EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=self.principalService.tenantId)
				]
			))
		finally:
			self.storage.close()
