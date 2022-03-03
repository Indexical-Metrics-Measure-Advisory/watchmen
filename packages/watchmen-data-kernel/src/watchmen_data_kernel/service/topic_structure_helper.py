from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_replace_topic_to_storage, ask_sync_topic_to_storage
from watchmen_model.admin import Topic
from watchmen_utilities import is_blank
from .storage_helper import ask_topic_storage


def beautify_name(topic: Topic) -> str:
	return '' if is_blank(topic.name) else topic.name.strip().lower()


def can_do_next(topic: Topic) -> bool:
	if is_blank(topic.dataSourceId):
		return False
	if beautify_name(topic) == '':
		return False
	return True


def create_topic_structure(topic: Topic, principal_service: PrincipalService) -> None:
	if not can_do_next(topic):
		return


def drop_topic_structure(topic: Topic, principal_service: PrincipalService) -> None:
	if not can_do_next(topic):
		return

	storage = ask_topic_storage(topic, principal_service)


def update_topic_structure(topic: Topic, original_topic: Topic, principal_service: PrincipalService) -> None:
	if not can_do_next(topic):
		return


def should_replace(topic: Topic, original_topic: Topic) -> bool:
	if ask_replace_topic_to_storage():
		return True
	elif topic.dataSourceId != original_topic.dataSourceId:
		return True
	elif is_blank(original_topic.dataSourceId):
		return True

	name = beautify_name(topic)
	original_name = beautify_name(original_topic)
	if name != original_name:
		return True
	elif is_blank(original_name):
		return True

	return False


def sync_topic_structure_storage(
		topic: Topic, original_topic: Optional[Topic], principal_service: PrincipalService) -> None:
	if not ask_sync_topic_to_storage():
		return

	if original_topic is None:
		create_topic_structure(topic, principal_service)
	elif should_replace(topic, original_topic):
		drop_topic_structure(original_topic, principal_service)
		create_topic_structure(topic, principal_service)
	else:
		update_topic_structure(topic, original_topic, principal_service)
