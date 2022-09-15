from typing import Union

from watchmen_model.admin import Topic, TopicKind
from .storage_types import ColumnNameLiteral


def as_table_name(topic_or_name_or_column_name_literal: Union[Topic, str, ColumnNameLiteral]) -> str:
	x = topic_or_name_or_column_name_literal
	if isinstance(x, str):
		return f'topic_{x.strip().lower()}'
	elif isinstance(x, ColumnNameLiteral):
		if x.synonym:
			return x.entityName.strip().lower()
		else:
			return f'topic_{x.entityName.strip().lower()}'
	elif x.kind == TopicKind.SYNONYM:
		# use exactly the given name
		return x.name.strip().lower()
	else:
		return f'topic_{x.name.strip().lower()}'
