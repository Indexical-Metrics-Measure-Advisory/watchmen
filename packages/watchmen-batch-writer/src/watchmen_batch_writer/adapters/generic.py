from logging import getLogger
from typing import Any, Dict, List

from watchmen_data_kernel.storage import TopicDataEntityHelper
from watchmen_storage import TopicDataStorageSPI

from .base import BaseAdapter

logger = getLogger(__name__)


class GenericAdapter(BaseAdapter):

	def batch_insert(self, storage: TopicDataStorageSPI, helper: TopicDataEntityHelper,
	                 rows: List[Dict[str, Any]]) -> int:
		if not rows:
			return 0
		entity_helper = helper.get_entity_helper()
		storage.connect()
		try:
			storage.insert_all(rows, entity_helper)
		finally:
			storage.close()
		return len(rows)

	def batch_upsert(self, storage: TopicDataStorageSPI, helper: TopicDataEntityHelper,
	                 rows: List[Dict[str, Any]], pk_columns: List[str]) -> int:
		if not rows:
			return 0
		entity_helper = helper.get_entity_helper()
		entity_id_helper = helper.get_entity_id_helper()
		storage.connect()
		try:
			for row in rows:
				has_id, _ = helper.find_data_id(row)
				if has_id:
					updated = storage.update_one(row, entity_id_helper)
					if updated == 0:
						storage.insert_one(row, entity_helper)
				else:
					storage.insert_one(row, entity_helper)
		finally:
			storage.close()
		return len(rows)
