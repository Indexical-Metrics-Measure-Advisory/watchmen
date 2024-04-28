from typing import Dict
from string import Template

from watchmen_utilities import ArrayHelper

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


def as_file_name(literal: str, row: Dict) -> str:
	tokens = literal.split("/")
	values = {}

	def set_value_from_row(token: str):
		variable_name = token.removeprefix("${").removesuffix("}")
		values[variable_name] = row.get(variable_name)

	def set_value_from_now():
		now = datetime.now()
		values["year"] = now.strftime("%Y")
		values["month"] = now.strftime("%m")
		values["day"] = now.strftime("%d")
		values["hour"] = now.strftime("%Y")
		values["minute"] = now.strftime("%Y")
		values["sec"] = now.strftime("%Y")

	ArrayHelper(tokens).each(set_value_from_row)
	set_value_from_now()

	tmp = Template(literal)
	return tmp.safe_substitute(values)

