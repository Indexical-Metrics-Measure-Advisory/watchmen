from abc import ABC, abstractmethod

from watchmen_lineage.storage.lineage_storage import LineageStorageService


class LineageComputeService(ABC):

	def __init__(self, storage):
		self.storage: LineageStorageService = storage

	@abstractmethod
	def get_lineage_results(self, facet):
		pass
