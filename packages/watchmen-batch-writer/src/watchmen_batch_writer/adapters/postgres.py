import csv
import io
import uuid
from datetime import date, datetime
from decimal import Decimal
from logging import getLogger
from typing import Any, Dict, List, Optional

from watchmen_data_kernel.storage import TopicDataEntityHelper
from watchmen_storage import TopicDataStorageSPI

from .base import BaseAdapter

logger = getLogger(__name__)


class PostgresAdapter(BaseAdapter):

	def batch_insert(self, storage: TopicDataStorageSPI, helper: TopicDataEntityHelper,
	                 rows: List[Dict[str, Any]]) -> int:
		if not rows:
			return 0
		entity_helper = helper.get_entity_helper()
		columns = self._get_column_names(helper)
		table_name = entity_helper.name
		raw_conn = self._get_raw_connection(storage)
		cursor = raw_conn.cursor()
		try:
			self._copy_csv(cursor, rows, columns, table_name)
			raw_conn.commit()
		except Exception:
			raw_conn.rollback()
			raise
		return len(rows)

	def batch_upsert(self, storage: TopicDataStorageSPI, helper: TopicDataEntityHelper,
	                 rows: List[Dict[str, Any]], pk_columns: List[str]) -> int:
		if not rows:
			return 0
		entity_helper = helper.get_entity_helper()
		target_table = entity_helper.name
		columns = self._get_column_names(helper)
		staging = f'_stg_{target_table}_{uuid.uuid4().hex[:8]}'

		raw_conn = self._get_raw_connection(storage)
		cursor = raw_conn.cursor()
		try:
			cursor.execute(
				f'CREATE TEMP TABLE "{staging}" (LIKE "{target_table}" INCLUDING DEFAULTS)')
			self._copy_csv(cursor, rows, columns, staging)

			col_names = ', '.join(f'"{c}"' for c in columns)
			if pk_columns:
				pk_names = ', '.join(f'"{c}"' for c in pk_columns)
				update_cols = [c for c in columns if c not in pk_columns]
				if update_cols:
					update_sets = ', '.join(
						f'"{c}" = EXCLUDED."{c}"' for c in update_cols)
					merge_sql = (
						f'INSERT INTO "{target_table}" ({col_names}) '
						f'SELECT {col_names} FROM "{staging}" '
						f'ON CONFLICT ({pk_names}) DO UPDATE SET {update_sets}'
					)
				else:
					merge_sql = (
						f'INSERT INTO "{target_table}" ({col_names}) '
						f'SELECT {col_names} FROM "{staging}" '
						f'ON CONFLICT ({pk_names}) DO NOTHING'
					)
			else:
				merge_sql = (
					f'INSERT INTO "{target_table}" ({col_names}) '
					f'SELECT {col_names} FROM "{staging}"'
				)
			cursor.execute(merge_sql)
			cursor.execute(f'DROP TABLE IF EXISTS "{staging}"')
			raw_conn.commit()
		except Exception:
			raw_conn.rollback()
			try:
				cursor.execute(f'DROP TABLE IF EXISTS "{staging}"')
				raw_conn.commit()
			except Exception:
				pass
			raise
		return len(rows)

	@staticmethod
	def _get_column_names(helper: TopicDataEntityHelper) -> List[str]:
		shaper = helper.get_entity_shaper()
		mapper = shaper.get_mapper()
		return mapper.get_column_names()

	@staticmethod
	def _get_raw_connection(storage: TopicDataStorageSPI):
		storage.connect()
		sa_conn = storage.connection
		dbapi_conn = sa_conn.connection
		if hasattr(dbapi_conn, 'dbapi_connection'):
			dbapi_conn = dbapi_conn.dbapi_connection
		return dbapi_conn

	@staticmethod
	def _csv_value(val: Any) -> str:
		if val is None:
			return '\\N'
		if isinstance(val, bool):
			return 't' if val else 'f'
		if isinstance(val, (datetime, date)):
			return val.isoformat()
		if isinstance(val, Decimal):
			return str(val)
		if isinstance(val, (bytes, bytearray)):
			return f'\\\\x{val.hex()}'
		return str(val)

	def _copy_csv(self, cursor, rows: List[Dict[str, Any]],
	              columns: List[str], table_name: str) -> None:
		buf = io.StringIO()
		writer = csv.writer(buf, delimiter='\t', quoting=csv.QUOTE_NONE, escapechar='\\',
		                    lineterminator='\n')
		for row in rows:
			values = [self._csv_value(row.get(col)) for col in columns]
			writer.writerow(values)
		buf.seek(0)

		col_names = ', '.join(f'"{c}"' for c in columns)
		copy_sql = (
			f'COPY "{table_name}" ({col_names}) FROM STDIN '
			f"WITH (FORMAT csv, DELIMITER E'\\t', NULL '\\N', ESCAPE '\\')"
		)
		cursor.copy_expert(copy_sql, buf)
