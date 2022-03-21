from enum import Enum
from typing import List

from pydantic import BaseModel

from watchmen_model.common import DataModel, DataSourceId, OptimisticLock, TenantBasedTuple


class DataSourceParam(DataModel, BaseModel):
	name: str = None
	value: str = None


class DataSourceType(str, Enum):
	MYSQL = 'mysql',
	ORACLE = 'oracle',
	MONGODB = 'mongodb',
	MSSQL = 'mssql'


class DataSource(TenantBasedTuple, OptimisticLock, BaseModel):
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
