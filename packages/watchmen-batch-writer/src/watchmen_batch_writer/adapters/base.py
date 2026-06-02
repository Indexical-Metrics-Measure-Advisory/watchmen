from abc import ABC, abstractmethod
from typing import Any, Dict, List

from watchmen_data_kernel.storage import TopicDataEntityHelper
from watchmen_model.system import DataSourceType
from watchmen_storage import TopicDataStorageSPI


class BaseAdapter(ABC):
	@abstractmethod
	def batch_insert(self, storage: TopicDataStorageSPI, helper: TopicDataEntityHelper,
	                 rows: List[Dict[str, Any]]) -> int:
		pass

	@abstractmethod
	def batch_upsert(self, storage: TopicDataStorageSPI, helper: TopicDataEntityHelper,
	                 rows: List[Dict[str, Any]], pk_columns: List[str]) -> int:
		pass


def get_adapter(data_source_type: DataSourceType) -> BaseAdapter:
	if data_source_type is None:
		from .generic import GenericAdapter
		return GenericAdapter()
	if data_source_type == DataSourceType.POSTGRESQL:
		from .postgres import PostgresAdapter
		return PostgresAdapter()
	elif data_source_type == DataSourceType.MYSQL:
		from .mysql import MySQLAdapter
		return MySQLAdapter()
	else:
		from .generic import GenericAdapter
		return GenericAdapter()
