from __future__ import annotations

from abc import abstractmethod
from typing import List

from watchmen_reactor.pipeline_schema_interface import TopicStorages


class PipelineContext:
	@abstractmethod
	def start(self, storages: TopicStorages) -> List[PipelineContext]:
		pass
