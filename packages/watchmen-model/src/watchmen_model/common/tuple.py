from datetime import date, datetime

from pydantic import BaseConfig, BaseModel

from .tuple_ids import UserId

"""
Super model of tuple, which 
1. contains 4 audit properties. There is no timezone for datetime,
2. align the json serialization/deserialization format
"""


class Tuple(BaseModel):
	createdAt: datetime = datetime.now().replace(tzinfo=None)
	createdBy: UserId = None
	lastModifiedAt: datetime = datetime.now().replace(tzinfo=None)
	lastModifiedBy: UserId = None

	class Config(BaseConfig):
		json_encoders = {
			datetime: lambda dt: dt.isoformat(),
			date: lambda dt: dt.isoformat()
		}


class OptimisticLock(BaseModel):
	version: int = 1
