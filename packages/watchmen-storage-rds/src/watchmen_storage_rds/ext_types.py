import json
import uuid

from sqlalchemy.dialects import postgresql
from sqlalchemy.types import TypeDecorator, CLOB, String

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


class UUIDToString(TypeDecorator):
    impl = String(36)
    cache_ok = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        elif isinstance(value, uuid.UUID):
            return str(value)
        elif isinstance(value, str):
            try:
                uuid.UUID(value)
                return value
            except ValueError:
                raise ValueError(f"Invalid UUID string: {value}")
        raise TypeError(f"Unsupported type for UUID: {type(value)} (expected uuid.UUID or str)")

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return str(value)
        return value

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(postgresql.UUID())
        else:
            return dialect.type_descriptor(String(36))