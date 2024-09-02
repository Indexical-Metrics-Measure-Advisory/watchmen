from enum import Enum
from typing import List, Optional, Union

from watchmen_model.common import DataModel, DataSourceId, OptimisticLock, TenantBasedTuple
from watchmen_utilities import ArrayHelper, ExtendedBaseModel


class DataSourceParam(DataModel, ExtendedBaseModel):
	name: Optional[str] = None
	value: Optional[str] = None


class DataSourceType(str, Enum):
	MYSQL = 'mysql',
	ORACLE = 'oracle',
	MONGODB = 'mongodb',
	MSSQL = 'mssql',
	POSTGRESQL = 'postgresql',
	OSS = 'oss',
	S3 = 's3',
	ADLS = 'adls'  # Azure Data Lake Storage


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


class DataSource(TenantBasedTuple, OptimisticLock, ExtendedBaseModel):
	dataSourceId: Optional[DataSourceId] = None
	dataSourceCode: Optional[str] = None
	dataSourceType: Optional[DataSourceType] = None
	host: Optional[str] = None
	port: Optional[str] = None
	username: Optional[str] = None
	password: Optional[str] = None
	name: Optional[str] = None
	url: Optional[str] = None
	params: Optional[List[DataSourceParam]] = []

	def __setattr__(self, name, value):
		if name == 'params':
			super().__setattr__(name, construct_params(value))
		else:
			super().__setattr__(name, value)
