from typing import TypeVar, Optional

from watchmen_auth import PrincipalService

from watchmen_meta.common.storage_service import StorableId, EntityService
from watchmen_model.common import Storable

from watchmen_model.system import PackageVersion

from watchmen_storage import EntityName, EntityShaper, EntityRow, \
	EntityFinder, EntityCriteriaExpression, ColumnNameLiteral, SnowflakeGenerator, TransactionalStorageSPI
from watchmen_utilities import ArrayHelper

VersionId = TypeVar('VersionId', bound=str)


class PackageVersionShaper(EntityShaper):
	
	def serialize(self, package_version: PackageVersion) -> EntityRow:
		return {
			'version_id': package_version.versionId,
			'previous_version': package_version.preVersion,
			'current_version': package_version.currVersion,
			'tenant_id': package_version.tenantId,
			'created_at': package_version.createdAt,
			'created_by': package_version.createdBy,
			'last_modified_at': package_version.lastModifiedAt,
			'last_modified_by': package_version.lastModifiedBy
		}
	
	def deserialize(self, row: EntityRow) -> PackageVersion:
		# noinspection PyTypeChecker
		return PackageVersion(
			versionId=row.get('version_id'),
			preVersion=row.get('previous_version'),
			currVersion=row.get('current_version'),
			tenantId=row.get('tenant_id'),
			createdAt=row.get('created_at'),
			createdBy=row.get('created_by'),
			lastModifiedAt=row.get('last_modified_at'),
			lastModifiedBy=row.get('last_modified_by')
		)


PACKAGE_VERSIONS_TABLE = 'package_versions'
PACKAGE_VERSIONS_ENTITY_SHAPER = PackageVersionShaper()


class PackageVersionService(EntityService):

	def __init__(
			self,
			storage: TransactionalStorageSPI,
			snowflake_generator: SnowflakeGenerator,
			principal_service: PrincipalService
	):
		super().__init__(storage)
		self.with_snowflake_generator(snowflake_generator)
		self.with_principal_service(principal_service)

	def get_entity_name(self) -> EntityName:
		return PACKAGE_VERSIONS_TABLE
	
	def get_entity_shaper(self) -> EntityShaper:
		return PACKAGE_VERSIONS_ENTITY_SHAPER

	# noinspection SpellCheckingInspection
	def get_storable_id_column_name(self) -> EntityName:
		return 'version_id'

	# noinspection SpellCheckingInspection
	def get_storable_id(self, storable: PackageVersion) -> StorableId:
		return storable.versionId

	# noinspection SpellCheckingInspection
	def set_storable_id(self, storable: PackageVersion, storable_id: VersionId) -> Storable:
		storable.versionId = storable_id
		return storable

	def insert_one(self, package_version: PackageVersion) -> PackageVersion:
		self.try_to_prepare_auditable_on_create(package_version)
		self.storage.insert_one(package_version, self.get_entity_helper())
		return package_version

	def update(self, package_version: PackageVersion) -> PackageVersion:
		self.storage.update_one(package_version, self.get_entity_id_helper())
		return package_version

	def increase_package_version(self) -> PackageVersion:
		tenant_id = self.principalService.get_tenant_id()
		package_version = self.find_by_tenant(tenant_id)
		if package_version:
			package_version.preVersion = package_version.currVersion
			package_version.currVersion = self.auto_increase_version(package_version.currVersion)
			self.update(package_version)
			return package_version
		else:
			raise ValueError(f"{tenant_id} can't found package version")

	# noinspection PyMethodMayBeStatic
	def auto_increase_version(self, current_version: str) -> str:
		version_list = current_version.split(".")
		major, minor, patch = version_list[0], version_list[1], version_list[2]
		if int(patch) + 1 < 100:
			return f"{major}.{minor}.{str(int(patch) + 1)}"
		if int(minor) + 1 < 100:
			return f"{major}.{str(int(minor) + 1)}.0"
		if int(major) + 1 < 100:
			return f"{str(int(major) + 1)}.0.0"

	def get_package_version_by_id(self, id_: str) -> Optional[PackageVersion]:
		return self.storage.find_by_id(id_, self.get_entity_id_helper())

	def find_by_tenant(self, tenant_id: str) -> Optional[PackageVersion]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id)
			]
		))

	def find_one(self) -> Optional[PackageVersion]:
		return self.storage.find_one(EntityFinder(
			name=self.get_entity_name(),
			shaper=self.get_entity_shaper(),
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=self.principalService.get_tenant_id())
			]
		))
