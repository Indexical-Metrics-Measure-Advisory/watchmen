from __future__ import annotations

from abc import abstractmethod
from typing import List

from .topic_storages import TopicStorages


class PipelineContext:
	@abstractmethod
	def start(self, storages: TopicStorages) -> List[PipelineContext]:
		pass
