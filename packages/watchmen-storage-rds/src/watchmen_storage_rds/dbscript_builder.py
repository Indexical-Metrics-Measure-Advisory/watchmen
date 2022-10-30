from abc import abstractmethod, ABC
from typing import List

from watchmen_model.admin import Topic


class ScriptBuilder(ABC):
	
	@abstractmethod
	def generate_insert_into_statement(self, table_name: str, data: dict) -> str:
		pass
	
	@abstractmethod
	def generate_update_statement(self, table_name: str, primary_key: str, data: dict) -> str:
		pass

	@abstractmethod
	def generate_create_table_statement(self, topic: Topic) -> str:
		pass
	
	@abstractmethod
	def generate_alert_table_statement(self, topic: Topic, original_topic: Topic) -> str:
		pass

	@abstractmethod
	def generate_unique_indexes_statement(self, topic: Topic) -> List[str]:
		pass

	@abstractmethod
	def generate_index_statement(self, topic: Topic) -> List[str]:
		pass
