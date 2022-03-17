from typing import Any, Dict, List

from watchmen_auth import PrincipalService
from watchmen_model.admin import Topic
from watchmen_model.common import DataPage
from watchmen_storage import FreeAggregatePager, FreeAggregator, FreeFinder, FreePager
from .trino_storage_spi import TrinoStorageSPI


class TrinoStorage(TrinoStorageSPI):
	def __init__(self, principal_service: PrincipalService):
		self.principalService = principal_service

	def register_topic(self, topic: Topic) -> None:
		pass

	def connect(self) -> None:
		pass

	def close(self) -> None:
		pass

	def free_find(self, finder: FreeFinder) -> List[Dict[str, Any]]:
		pass

	def free_page(self, pager: FreePager) -> DataPage:
		pass

	def free_aggregate_find(self, aggregator: FreeAggregator) -> List[Dict[str, Any]]:
		pass

	def free_aggregate_page(self, pager: FreeAggregatePager) -> DataPage:
		pass
