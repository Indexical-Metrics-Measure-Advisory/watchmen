from json import dumps, JSONEncoder
from typing import Any, Type, Optional

from watchmen_utilities.datetime_helper import DateTimeEncoder


DEFAULT_JSON_CONFIG = {
    "cls": DateTimeEncoder,
    "ensure_ascii": False,
    "indent": None,
    "sort_keys": False
}

def serialize_to_json(
		o: Any,
		cls: Optional[Type[JSONEncoder]] = None,
		ensure_ascii: Optional[bool] = None,
		** kwargs) -> str:
	config = {
		**DEFAULT_JSON_CONFIG,
		"cls": cls if cls is not None else DEFAULT_JSON_CONFIG["cls"],
		"ensure_ascii": ensure_ascii if ensure_ascii is not None else DEFAULT_JSON_CONFIG["ensure_ascii"],
		**kwargs
	}
	config = {k: v for k, v in config.items() if v is not None}
	return dumps(o, **config)