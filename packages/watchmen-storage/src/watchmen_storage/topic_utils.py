from typing import Union

from watchmen_model.admin import Topic


def as_table_name(topic_or_name: Union[Topic, str]) -> str:
	if isinstance(topic_or_name, str):
		return f'topic_{topic_or_name.strip().lower()}'
	else:
		return f'topic_{topic_or_name.name.strip().lower()}'
