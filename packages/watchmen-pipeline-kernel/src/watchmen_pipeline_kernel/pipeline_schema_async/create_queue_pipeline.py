from typing import Callable

from watchmen_data_kernel.storage import TopicTrigger
from watchmen_data_kernel.topic_schema import TopicSchema

CreateQueuePipeline = Callable[[TopicSchema, TopicTrigger], None]
