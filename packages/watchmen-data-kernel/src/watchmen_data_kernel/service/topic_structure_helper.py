from typing import Optional

from watchmen_auth import PrincipalService
from watchmen_data_kernel.common import ask_replace_topic_to_storage, ask_sync_topic_to_storage, ask_trino_enabled
from watchmen_model.admin import Topic, TopicKind
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

	storage = ask_topic_storage(topic, principal_service)
	# create topic only when topic is not a synonym
	if topic.kind != TopicKind.SYNONYM:
		storage.create_topic_entity(topic)


def drop_topic_structure(topic: Topic, principal_service: PrincipalService) -> None:
	if not can_do_next(topic):
		return

	storage = ask_topic_storage(topic, principal_service)
	# drop topic only when topic is not a synonym
	if topic.kind != TopicKind.SYNONYM:
		storage.drop_topic_entity(topic)


def update_topic_structure(topic: Topic, original_topic: Topic, principal_service: PrincipalService) -> None:
	if not can_do_next(topic):
		return

	storage = ask_topic_storage(topic, principal_service)
	# update topic structure only when topic is not a synonym
	if topic.kind != TopicKind.SYNONYM:
		storage.update_topic_entity(topic, original_topic)


def sync_for_trino(topic: Topic, original_topic: Optional[Topic], principal_service: PrincipalService) -> None:
	if original_topic is not None and can_do_next(original_topic):
		storage = ask_topic_storage(original_topic, principal_service)
		storage.drop_topic_from_trino(original_topic)

	if can_do_next(topic):
		storage = ask_topic_storage(topic, principal_service)
		storage.append_topic_to_trino(topic)


def sync_topic_structure_storage(
		topic: Topic, original_topic: Optional[Topic], principal_service: PrincipalService) -> None:
	if ask_trino_enabled():
		sync_for_trino(topic, original_topic, principal_service)

	if not ask_sync_topic_to_storage():
		return

	if original_topic is None:
		create_topic_structure(topic, principal_service)
	elif ask_replace_topic_to_storage():
		drop_topic_structure(original_topic, principal_service)
		create_topic_structure(topic, principal_service)
	elif topic.dataSourceId != original_topic.dataSourceId:
		# not in same data source, leave original as is
		create_topic_structure(topic, principal_service)
	elif is_blank(original_topic.dataSourceId):
		# no data source declared in original, typically no storage entity existing
		# simply do create for new one
		create_topic_structure(topic, principal_service)
	elif beautify_name(topic) != beautify_name(original_topic):
		# name changed, leave original as is
		create_topic_structure(topic, principal_service)
	else:
		# with same name, same data source, update it
		update_topic_structure(topic, original_topic, principal_service)
