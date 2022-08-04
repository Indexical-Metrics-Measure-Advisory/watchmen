from typing import Dict
from string import Template
from watchmen_model.admin import Topic
from watchmen_model.common import TopicId
from watchmen_storage import UnexpectedStorageException
from datetime import datetime

object_directory: Dict[TopicId, str] = {}


def register_directory(topic: Topic) -> None:
	object_directory[topic.topicId] = topic.name


def find_directory(name: str) -> str:
	directory = object_directory.get(name)
	if directory is None:
		raise UnexpectedStorageException(f'Table[{name}] definition not found.')
	return directory


def as_file_name(literal: str, directory: str, id_: str) -> str:
	tmp = Template(literal)
	now = datetime.now()
	values = {'year': now.strftime("%Y"),
	          'month': now.strftime("%m"),
	          'day': now.strftime("%d"),
	          'hour': now.strftime("%H"),
	          'minute': now.strftime("%M"),
	          'sec': now.strftime("%S"),
	          'directory': directory,
	          'id': id_
	          }
	return tmp.substitute(values)
