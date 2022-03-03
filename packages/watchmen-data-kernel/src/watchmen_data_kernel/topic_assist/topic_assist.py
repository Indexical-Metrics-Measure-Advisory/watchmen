from typing import Optional

from watchmen_data_kernel.common import ask_replace_topic_to_storage, ask_sync_topic_to_storage
from watchmen_model.admin import Topic


def create_topic_structure(topic: Topic) -> None:
	pass


def drop_topic_structure(topic: Topic) -> None:
	pass


def update_topic_structure(topic: Topic, original_topic: Topic) -> None:
	pass


def sync_topic_structure_storage(topic: Topic, original_topic: Optional[Topic]) -> None:
	if not ask_sync_topic_to_storage():
		return

	if original_topic is None:
		create_topic_structure(topic)
	elif ask_replace_topic_to_storage():
		drop_topic_structure(original_topic)
		create_topic_structure(topic)
	elif topic.dataSourceId != original_topic.dataSourceId:
		drop_topic_structure(original_topic)
		create_topic_structure(topic)
	else:
		update_topic_structure(topic, original_topic)
