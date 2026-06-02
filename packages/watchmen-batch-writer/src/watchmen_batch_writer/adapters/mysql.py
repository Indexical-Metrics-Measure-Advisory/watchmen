from logging import getLogger
from typing import Any, Dict, List

from sqlalchemy import text

from watchmen_data_kernel.storage import TopicDataEntityHelper
from watchmen_storage import TopicDataStorageSPI

from .base import BaseAdapter

logger = getLogger(__name__)


class MySQLAdapter(BaseAdapter):
	MAX_BATCH = 1000

	def batch_insert(self, storage: TopicDataStorageSPI, helper: TopicDataEntityHelper,
	                 rows: List[Dict[str, Any]]) -> int:
		if not rows:
			return 0
		columns = self._get_column_names(helper)
		storage.connect()
		try:
			conn = storage.connection
			total = 0
			for chunk in self._chunks(rows, self.MAX_BATCH):
				sql, params = self._build_insert(helper, columns, chunk)
				conn.execute(text(sql), params)
				total += len(chunk)
			conn.commit()
			return total
		except Exception:
			try:
				storage.connection.rollback()
			except Exception:
				pass
			raise
		finally:
			storage.close()

	def batch_upsert(self, storage: TopicDataStorageSPI, helper: TopicDataEntityHelper,
	                 rows: List[Dict[str, Any]], pk_columns: List[str]) -> int:
		if not rows:
			return 0
		columns = self._get_column_names(helper)
		storage.connect()
		try:
			conn = storage.connection
			total = 0
			for chunk in self._chunks(rows, self.MAX_BATCH):
				sql, params = self._build_upsert(helper, columns, chunk, pk_columns)
				conn.execute(text(sql), params)
				total += len(chunk)
			conn.commit()
			return total
		except Exception:
			try:
				storage.connection.rollback()
			except Exception:
				pass
			raise
		finally:
			storage.close()

	@staticmethod
	def _get_column_names(helper: TopicDataEntityHelper) -> List[str]:
		shaper = helper.get_entity_shaper()
		mapper = shaper.get_mapper()
		return mapper.get_column_names()

	@staticmethod
	def _build_insert(helper: TopicDataEntityHelper, columns: List[str], rows: List[Dict[str, Any]]):
		table_name = helper.get_entity_helper().name
		col_names = ', '.join(f'`{c}`' for c in columns)
		value_groups = []
		params: Dict[str, Any] = {}
		for i, row in enumerate(rows):
			group = []
			for c in columns:
				key = f'{c}_{i}'
				group.append(f':{key}')
				params[key] = row.get(c)
			value_groups.append(f'({", ".join(group)})')
		sql = f'INSERT INTO `{table_name}` ({col_names}) VALUES {", ".join(value_groups)}'
		return sql, params

	@staticmethod
	def _build_upsert(helper: TopicDataEntityHelper, columns: List[str],
	                  rows: List[Dict[str, Any]], pk_columns: List[str]):
		table_name = helper.get_entity_helper().name
		col_names = ', '.join(f'`{c}`' for c in columns)
		update_sets = ', '.join(
			f'`{c}` = VALUES(`{c}`)'
			for c in columns if c not in pk_columns
		)
		value_groups = []
		params: Dict[str, Any] = {}
		for i, row in enumerate(rows):
			group = []
			for c in columns:
				key = f'{c}_{i}'
				group.append(f':{key}')
				params[key] = row.get(c)
			value_groups.append(f'({", ".join(group)})')
		sql = (
			f'INSERT INTO `{table_name}` ({col_names}) VALUES {", ".join(value_groups)} '
			f'ON DUPLICATE KEY UPDATE {update_sets}'
		)
		return sql, params

	@staticmethod
	def _chunks(lst, size):
		for i in range(0, len(lst), size):
			yield lst[i:i + size]
