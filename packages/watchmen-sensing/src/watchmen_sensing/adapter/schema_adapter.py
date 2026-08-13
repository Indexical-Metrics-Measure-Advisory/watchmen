from typing import List, Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.meta import DataSourceService
from watchmen_data_kernel.storage.topic_storage import build_topic_data_storage
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import DataSourceId
from watchmen_model.system import DataSource

from watchmen_sensing.engine.schema_diff_engine import fingerprint
from watchmen_sensing.meta.schema_snapshot_service import SchemaSnapshotService
from watchmen_sensing.model.schema_snapshot import ColumnDescriptor, SchemaSnapshot, TableSchema


def _schema_of(data_source: DataSource) -> Optional[str]:
	"""Resolve the target schema name, mirroring the collector convention:
	``params['schema']`` first, then ``DataSource.name``.
	"""
	params = getattr(data_source, 'params', None) or []
	for param in params:
		name = getattr(param, 'name', None)
		if name == 'schema':
			value = getattr(param, 'value', None)
			if value:
				return str(value)
	name = getattr(data_source, 'name', None)
	return name or None


class SchemaIntrospectionAdapter:
	"""Live data-dictionary reflection + snapshot persistence for one DataSource.

	Connects to the external business database (read-only), lists its tables and
	columns via the SQLAlchemy inspector, and snapshots them so field-level drift
	can be detected. Connections are always disposed; reflection failures degrade
	to an empty table list so a single unreachable source cannot abort a cycle.
	"""

	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service
		self._data_source_service = DataSourceService(principal_service)
		self._snapshot_service = SchemaSnapshotService(
			ask_meta_storage(), ask_snowflake_generator(), principal_service)

	# ---- live reflection -------------------------------------------------

	def load_data_source(self, data_source_id: DataSourceId) -> Optional[DataSource]:
		try:
			return self._data_source_service.find_by_id(data_source_id)
		except Exception:
			return None

	def reflect_tables(self, data_source: DataSource) -> Optional[List[TableSchema]]:
		"""Connect to the business DB and reflect all tables + columns.

		Returns ``None`` when reflection FAILED (unreachable DB, no engine,
		inspector error) and ``[]`` only when the schema is genuinely empty.
		Callers MUST treat ``None`` as "do not diff, do not advance baseline" so a
		single DB blip cannot wipe the baseline and flood false TABLE_REMOVED.
		"""
		engine = None
		try:
			storage = build_topic_data_storage(data_source)()
			engine = getattr(storage, 'engine', None)
			if engine is None:
				return None
			# Lazy import keeps sqlalchemy out of the module-load path.
			import sqlalchemy
			inspector = sqlalchemy.inspect(engine)
			schema = _schema_of(data_source)
			table_names = (
				inspector.get_table_names(schema=schema) if schema else inspector.get_table_names()
			)
			return [self._reflect_one(inspector, schema, name) for name in table_names]
		except Exception:
			return None
		finally:
			if engine is not None:
				try:
					engine.dispose()
				except Exception:
					pass

	@staticmethod
	def _reflect_one(inspector, schema: Optional[str], table_name: str) -> TableSchema:
		columns_raw = (
			inspector.get_columns(table_name, schema=schema)
			if schema else inspector.get_columns(table_name)
		)
		columns = []
		for column in (columns_raw or []):
			default = column.get('default')
			columns.append(ColumnDescriptor(
				name=column.get('name'),
				dataType=str(column.get('type')) if column.get('type') is not None else None,
				nullable=column.get('nullable'),
				defaultValue=None if default is None else str(default),
				comment=column.get('comment')
			))
		return TableSchema(tableName=table_name, schemaName=schema, columns=columns)

	# ---- snapshot persistence --------------------------------------------

	def latest_snapshot(self, data_source_id: str) -> Optional[SchemaSnapshot]:
		return trans_readonly(self._snapshot_service, lambda: self._snapshot_service.find_latest(
			data_source_id, self.principalService.get_tenant_id()))

	def list_history(self, data_source_id: str) -> List[SchemaSnapshot]:
		return trans_readonly(self._snapshot_service, lambda: self._snapshot_service.find_history(
			data_source_id, self.principalService.get_tenant_id()))

	def capture_snapshot(self, data_source_id: str) -> Optional[SchemaSnapshot]:
		"""Reflect the live schema and persist it as a new snapshot row.

		Returns None (and persists nothing) when reflection fails, so a failed
		reflection can never become an empty baseline.
		"""
		data_source = self.load_data_source(data_source_id)
		if data_source is None:
			return None
		tables = self.reflect_tables(data_source)
		if tables is None:
			# Reflection failed: never persist a (false) empty baseline.
			return None
		snapshot = SchemaSnapshot(
			dataSourceId=data_source_id,
			schemaName=_schema_of(data_source),
			tables=tables,
			tableCount=len(tables),
			fingerprint=fingerprint(tables),
			tenantId=self.principalService.get_tenant_id(),
		)
		snapshot.snapshotId = str(self._snapshot_service.snowflakeGenerator.next_id())
		return trans(self._snapshot_service, lambda: self._snapshot_service.create(snapshot))
