from datetime import date, datetime

from pydantic import BaseConfig, BaseModel

from .storable import Auditable, Storable

"""
Super model of tuple, which 
1. contains 4 audit properties. There is no timezone for datetime,
2. align the json serialization/deserialization format
"""


class Tuple(Storable, Auditable, BaseModel):
	class Config(BaseConfig):
		json_encoders = {
			datetime: lambda dt: dt.isoformat(),
			date: lambda dt: dt.isoformat()
		}
