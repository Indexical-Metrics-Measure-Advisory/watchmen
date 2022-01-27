from json import dumps
from typing import Any

from watchmen_utilities.datetime_helper import DateTimeEncoder


def serialize_to_json(o: Any) -> str:
	return dumps(o, cls=DateTimeEncoder)
