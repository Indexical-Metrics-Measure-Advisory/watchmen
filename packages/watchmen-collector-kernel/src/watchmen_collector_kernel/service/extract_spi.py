from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Tuple
from watchmen_storage import EntityCriteria, EntityStraightColumn, DataSourceHelper


class ExtractorSPI(ABC):

	@abstractmethod
	def count_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		pass

	@abstractmethod
	def find_primary_keys_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		pass

	@abstractmethod
	def find_limited_primary_keys_by_criteria(self, criteria: EntityCriteria, limit: int) -> Optional[List[Dict[str, Any]]]:
		pass

	@abstractmethod
	def find_one_record_of_table(self) -> Optional[List[Dict[str, Any]]]:
		pass
	
	@abstractmethod
	def find_one_record_of_table_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		pass

	@abstractmethod
	def find_one_by_primary_keys(self, data_id: Dict) -> Optional[Dict[str, Any]]:
		pass

	@abstractmethod
	def find_records_by_criteria(self, criteria: EntityCriteria) -> Optional[List[Dict[str, Any]]]:
		pass

	@abstractmethod
	def delete_one_by_primary_keys(self, data_id: Dict):
		pass
