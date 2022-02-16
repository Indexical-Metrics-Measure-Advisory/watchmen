from typing import Any, Dict, Optional

from watchmen_model.admin import Pipeline
from watchmen_reactor.topic_schema import TopicSchema


class QueuedPipeline:
	def __init__(
			self,
			pipeline: Pipeline,
			trigger_topic_schema: TopicSchema,
			previous_data: Optional[Dict[str, Any]], current_data: Optional[Dict[str, Any]]
	):
		self.pipeline = pipeline
		self.trigger_topic_schema = trigger_topic_schema
		self.previous_data = previous_data
		self.current_data = current_data
