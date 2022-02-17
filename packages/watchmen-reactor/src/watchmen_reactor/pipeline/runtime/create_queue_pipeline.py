from typing import Callable

from watchmen_model.admin import Pipeline
from watchmen_reactor.pipeline_schema import PipelineContext
from watchmen_reactor.storage import TopicTrigger

CreateQueuePipeline = Callable[[Pipeline, TopicTrigger], PipelineContext]
