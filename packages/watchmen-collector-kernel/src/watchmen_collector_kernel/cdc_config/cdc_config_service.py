from typing import List

from watchmen_collector_kernel.model import CollectorTableConfig


class CollectorConfigHierarchy:

	def __init__(self, configs: List[CollectorTableConfig]):
		self.configs = configs

	def capture_change_data(self):
		pass # todo

	def build_json(self):
		pass # todo

	def listener(self):
		pass # todo



