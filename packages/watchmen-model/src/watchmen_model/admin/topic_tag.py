from typing import Optional

from watchmen_utilities import ExtendedBaseModel

from watchmen_model.common import TenantBasedTuple, TopicId, TopicTagId


class TopicTag(ExtendedBaseModel, TenantBasedTuple):
	"""
	relation between topic and tag, one row per tag assigned to a topic.
	tags of a topic are not persisted on the topic itself, they live here.
	"""
	topicTagId: Optional[TopicTagId] = None
	topicId: Optional[TopicId] = None
	tagName: Optional[str] = None
