from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen.model.common import DataSourceId, TenantId, Tuple


class DataSourceParam(BaseModel):
	name: str = None
	value: str = None


class DataSourceType(str, Enum):
	MYSQL = 'mysql',
	ORACLE = 'oracle',
	MONGODB = 'mongodb'


class DataSource(Tuple):
	dataSourceId: DataSourceId = None
	dataSourceCode: str = None
	dataSourceType: DataSourceType = None
	host: str = None
	port: str = None
	username: str = None
	password: str = None
	name: str = None
	url: str = None
	params: List[DataSourceParam] = []
	tenantId: TenantId = None
