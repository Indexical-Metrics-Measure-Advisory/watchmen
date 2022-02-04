from datetime import date, datetime

from pydantic import BaseConfig

from .storable import Auditable, Storable
from .tuple_ids import TenantId, UserId

"""
Super model of tuple, which 
1. contains 4 audit properties. There is no timezone for datetime,
2. align the json serialization/deserialization format
"""


class Tuple(Auditable):
	class Config(BaseConfig):
		json_encoders = {
			datetime: lambda dt: dt.isoformat(),
			date: lambda dt: dt.isoformat()
		}


class TenantBasedTuple(Tuple):
	tenantId: TenantId = None


class UserBasedTuple(Storable):
	"""
	no audit columns
	"""
	tenantId: TenantId = None
	userId: UserId = None

	class Config(BaseConfig):
		json_encoders = {
			datetime: lambda dt: dt.isoformat(),
			date: lambda dt: dt.isoformat()
		}
