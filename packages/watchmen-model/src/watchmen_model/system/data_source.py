from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel

from watchmen_model.common import DataModel, DataSourceId, OptimisticLock, TenantBasedTuple
from watchmen_utilities import ArrayHelper


class DataSourceParam(DataModel, BaseModel):
	name: str = None
	value: str = None


class DataSourceType(str, Enum):
	MYSQL = 'mysql',
	ORACLE = 'oracle',
	MONGODB = 'mongodb',
	MSSQL = 'mssql',
	POSTGRESQL = 'postgresql',
	OSS = 'oss',
	S3 = 's3'


def construct_param(param: Optional[Union[dict, DataSourceParam]]) -> Optional[DataSourceParam]:
	if param is None:
		return None
	elif isinstance(param, DataSourceParam):
		return param
	else:
		return DataSourceParam(**param)


def construct_params(params: Optional[list] = None) -> Optional[List[DataSourceParam]]:
	if params is None:
		return None
	else:
		return ArrayHelper(params).map(lambda x: construct_param(x)).to_list()


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

	def __setattr__(self, name, value):
		if name == 'params':
			super().__setattr__(name, construct_params(value))
		else:
			super().__setattr__(name, value)
