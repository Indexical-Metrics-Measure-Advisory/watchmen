from sqlalchemy.types import TypeDecorator, CLOB
import json

from watchmen_utilities import serialize_to_json


class ClobToJson(TypeDecorator):

	impl = CLOB
	cache_ok = True
	
	def process_bind_param(self, value, dialect):
		if value is not None:
			value = serialize_to_json(value)
		return value
	
	def process_result_value(self, value, dialect):
		if value is not None:
			value = json.loads(value)
		return value

	def coerce_compared_value(self, op, value):
		return self.impl.coerce_compared_value(op, value)
