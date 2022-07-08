from typing import Union

from watchmen_model.admin import Topic, TopicKind


def as_table_name(topic_or_name: Union[Topic, str]) -> str:
	if isinstance(topic_or_name, str):
		return f'topic_{topic_or_name.strip().lower()}'
	elif topic_or_name.kind == TopicKind.SYNONYM:
		# use exactly the given name
		return topic_or_name.name.strip().lower()
	else:
		return f'topic_{topic_or_name.name.strip().lower()}'
