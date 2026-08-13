from typing import List, Optional

from watchmen_meta.common import TupleService, TupleShaper
from watchmen_model.common import Pageable, TenantId
from watchmen_storage import (
	ColumnNameLiteral, EntityCriteriaExpression, EntityShaper, EntityRow, EntitySortColumn,
	EntitySortMethod
)
from watchmen_utilities import ArrayHelper

from watchmen_sensing.common.constants import SCHEMA_SNAPSHOT_ENTITY_NAME
from watchmen_sensing.model.schema_snapshot import SchemaSnapshot


def _dump_tables(tables) -> Optional[list]:
	if tables is None:
		return None
	return ArrayHelper(tables).map(
		lambda t: t.model_dump() if hasattr(t, 'model_dump') else t
	).to_list()


class SchemaSnapshotShaper(EntityShaper):
	def serialize(self, snapshot: SchemaSnapshot) -> EntityRow:
		return TupleShaper.serialize_tenant_based(snapshot, {
			'snapshot_id': snapshot.snapshotId,
			'data_source_id': snapshot.dataSourceId,
			'schema_name': snapshot.schemaName,
			'tables': _dump_tables(snapshot.tables),
			'table_count': snapshot.tableCount,
			'fingerprint': snapshot.fingerprint,
		})

	def deserialize(self, row: EntityRow) -> SchemaSnapshot:
		# noinspection PyTypeChecker
		return TupleShaper.deserialize_tenant_based(row, SchemaSnapshot(
			snapshotId=row.get('snapshot_id'),
			dataSourceId=row.get('data_source_id'),
			schemaName=row.get('schema_name'),
			tables=row.get('tables'),
			tableCount=row.get('table_count'),
			fingerprint=row.get('fingerprint'),
		))


SCHEMA_SNAPSHOT_ENTITY_SHAPER = SchemaSnapshotShaper()


class SchemaSnapshotService(TupleService):
	def should_record_operation(self) -> bool:
		return False

	def get_entity_name(self) -> str:
		return SCHEMA_SNAPSHOT_ENTITY_NAME

	def get_entity_shaper(self) -> EntityShaper:
		return SCHEMA_SNAPSHOT_ENTITY_SHAPER

	def get_storable_id(self, storable: SchemaSnapshot) -> str:
		return storable.snapshotId

	def set_storable_id(self, storable: SchemaSnapshot, storable_id: str) -> SchemaSnapshot:
		storable.snapshotId = storable_id
		return storable

	def get_storable_id_column_name(self) -> str:
		return 'snapshot_id'

	def find_by_id(self, snapshot_id: str) -> Optional[SchemaSnapshot]:
		# noinspection PyTypeChecker
		return self.storage.find_one(self.get_entity_finder(criteria=[
			EntityCriteriaExpression(left=ColumnNameLiteral(columnName='snapshot_id'), right=snapshot_id),
		]))

	def find_history(self, data_source_id: str, tenant_id: TenantId) -> List[SchemaSnapshot]:
		# noinspection PyTypeChecker
		return self.storage.find(self.get_entity_finder(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='data_source_id'), right=data_source_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			],
			sort=[EntitySortColumn(name='created_at', method=EntitySortMethod.DESC)]
		))

	def find_latest(self, data_source_id: str, tenant_id: TenantId) -> Optional[SchemaSnapshot]:
		# Only fetch the newest row instead of loading the whole history.
		page = self.storage.page(self.get_entity_pager(
			criteria=[
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='data_source_id'), right=data_source_id),
				EntityCriteriaExpression(left=ColumnNameLiteral(columnName='tenant_id'), right=tenant_id),
			],
			pageable=Pageable(pageNumber=1, pageSize=1),
			sort=[EntitySortColumn(name='created_at', method=EntitySortMethod.DESC)]
		))
		if not page.data:
			return None
		return page.data[0]
