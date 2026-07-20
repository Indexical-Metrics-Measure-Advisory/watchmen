import asyncio
from logging import getLogger
from typing import List

from watchmen_model.pipeline_kernel import PipelineMonitorLog
from watchmen_pipeline_kernel.pipeline_schema_async.pipeline_context import AsyncRuntimePipelineContext
from watchmen_pipeline_kernel.pipeline_schema_async.topic_storages import AsyncTopicStorages

logger = getLogger(__name__)


class AsyncPipelinesDispatcher:
	"""
	Async counterpart of PipelinesDispatcher. Drains the context queue by awaiting
	each context's start(), appending any cascading contexts it creates.
	"""

	def __init__(self, contexts: List[AsyncRuntimePipelineContext], storages: AsyncTopicStorages):
		self.contexts = contexts
		self.storages = storages

	async def start(self, handle_monitor_log) -> None:
		while self.contexts:
			context = self.next_context()
			created_contexts = await context.start(self.storages, handle_monitor_log)
			if len(created_contexts) != 0:
				# noinspection PyTypeChecker
				self.contexts.extend(created_contexts)

	def next_context(self) -> AsyncRuntimePipelineContext:
		if len(self.contexts) == 0:
			return None
		# get next context
		context = self.contexts[0]
		if context is None:
			from watchmen_pipeline_kernel.common import PipelineKernelException
			raise PipelineKernelException(f'Pipeline context is none, cannot be invoked.')
		# next context is ready, pop it
		self.contexts = self.contexts[1:]
		return context
