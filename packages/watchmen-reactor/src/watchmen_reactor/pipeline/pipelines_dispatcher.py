from typing import List, Optional

from watchmen_reactor.common import ReactorException
from .pipeline_context import RuntimePipelineContext
from .topic_helper import RuntimeTopicStorages


class PipelinesDispatcher:
	def __init__(self, contexts: List[RuntimePipelineContext], storages: RuntimeTopicStorages):
		self.contexts = contexts
		self.storages = storages

	def start(self) -> None:
		context = self.next_context()
		if context is None:
			# no context needs to be invoked
			return None

		created_contexts = context.start(self.storages)
		if len(created_contexts) != 0:
			self.contexts.extend(*created_contexts)
		# invoke next
		self.start()

	def next_context(self) -> Optional[RuntimePipelineContext]:
		if len(self.contexts) == 0:
			return None
		# get next context
		context = self.contexts[0]
		if context is None:
			raise ReactorException(f'Pipeline context is none, cannot be invoked.')
		# next context is ready, pop it
		self.contexts = self.contexts[1:]
		return context
