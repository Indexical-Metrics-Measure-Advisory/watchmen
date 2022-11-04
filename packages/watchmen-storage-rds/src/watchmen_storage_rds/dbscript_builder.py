from abc import abstractmethod, ABC
from typing import List

from watchmen_model.admin import Topic


class ScriptBuilder(ABC):
	
	@abstractmethod
	def sql_insert(self, table_name: str, data: dict) -> str:
		pass
	
	@abstractmethod
	def sql_update(self, table_name: str, primary_key: str, data: dict) -> str:
		pass

	@abstractmethod
	def sql_create_table(self, topic: Topic) -> str:
		pass
	
	@abstractmethod
	def sql_alert_table(self, topic: Topic, original_topic: Topic) -> List[str]:
		pass

	@abstractmethod
	def sql_unique_indexes(self, topic: Topic) -> List[str]:
		pass

	@abstractmethod
	def sql_index(self, topic: Topic) -> List[str]:
		pass
