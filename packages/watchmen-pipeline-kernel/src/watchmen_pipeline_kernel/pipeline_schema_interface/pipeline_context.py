from abc import abstractmethod
from typing import List

from .topic_storages import TopicStorages


# noinspection PyClassHasNoInit
class PipelineContext:
	@abstractmethod
	def start(self, storages: TopicStorages) -> List[PipelineContext]:
		pass
