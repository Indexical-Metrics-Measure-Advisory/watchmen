from typing import Callable

from watchmen_reactor.storage import TopicTrigger
from watchmen_reactor.topic_schema import TopicSchema

CreateQueuePipeline = Callable[[TopicSchema, TopicTrigger], None]
