from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import DataPage, Pageable, TenantId
from watchmen_storage import ColumnNameLiteral, EntityCriteriaExpression, EntityRow, EntityShaper, \
	EntitySortColumn, EntitySortMethod
from ..model.metrics import MetricVersion


class MetricVersionShaper(EntityShaper):

	@staticmethod
	def serialize_operation_type(operation_type) -> Optional[str]:
		if operation_type is None:
			return None
		return operation_type.value if hasattr(operation_type, 'value') else operation_type

	def serialize(self, version: MetricVersion) -> EntityRow:
		row = {
			'id': version.id,
			'metric_id': version.metricId,
			'metric_name': version.metricName,
			'version_no': version.versionNo,
			'operation_type': MetricVersionShaper.serialize_operation_type(version.operationType),
			'content': version.content,
			'comments': version.comments,
			'rollback_from_version_no': version.rollbackFromVersionNo,
		}
		row = TupleShaper.serialize_tenant_based(version, row)
		return row

	def deserialize(self, row: EntityRow) -> MetricVersion:
		version = MetricVersion(
			id=row.get('id'),
			metricId=row.get('metric_id'),
			metricName=row.get('metric_name'),
			versionNo=row.get('version_no'),
			operationType=row.get('operation_type'),
			content=row.get('content'),
			comments=row.get('comments'),
			rollbackFromVersionNo=row.get('rollback_from_version_no'),
		)
		# noinspection PyTypeChecker
		version: MetricVersion = TupleShaper.deserialize_tenant_based(row, version)
		return version


METRIC_VERSION_ENTITY_NAME = 'metric_versions'
METRIC_VERSION_ENTITY_SHAPER = MetricVersionShaper()

# newest version first
VERSION_NO_DESC_SORT = [EntitySortColumn(name='version_no', method=EntitySortMethod.DESC)]


class MetricVersionService(TupleService):

	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return METRIC_VERSION_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return METRIC_VERSION_ENTITY_SHAPER

	def get_storable_id(self, storable: MetricVersion) -> str:
		return storable.id

	def set_storable_id(self, storable: MetricVersion, storable_id: str) -> MetricVersion:
		storable.id = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'id'

	def find_by_metric_id(self, metric_id: str, tenant_id: Optional[TenantId] = None) -> List[MetricVersion]:
		criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='metric_id'), right=metric_id)]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(criteria=criteria, sort=VERSION_NO_DESC_SORT))

	def find_page_by_metric_id(
			self, metric_id: str, tenant_id: Optional[TenantId], pageable: Pageable) -> DataPage:
		criteria = [EntityCriteriaExpression(left=ColumnNameLiteral(columnName='metric_id'), right=metric_id)]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		return self.storage.page(self.get_entity_pager(criteria=criteria, pageable=pageable, sort=VERSION_NO_DESC_SORT))

	def find_by_metric_id_and_version_no(
			self, metric_id: str, version_no: int, tenant_id: Optional[TenantId] = None) -> Optional[MetricVersion]:
		criteria = [
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='metric_id'), right=metric_id),
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='version_no'), right=version_no),
		]
		if tenant_id is not None and len(tenant_id.strip()) != 0:
			criteria.append(EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id))
		# noinspection PyTypeChecker
		results = self.storage.find(self.get_entity_finder(criteria=criteria))
		return results[0] if results else None

	def find_max_version_no(self, metric_id: str, tenant_id: Optional[TenantId] = None) -> int:
		versions = self.find_by_metric_id(metric_id, tenant_id)
		if len(versions) == 0:
			return 0
		return max(v.versionNo for v in versions if v.versionNo is not None)
