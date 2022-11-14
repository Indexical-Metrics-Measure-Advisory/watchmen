from abc import abstractmethod
from enum import Enum
from typing import Optional, List, Dict, Any, Callable

from pydantic import BaseModel

from watchmen_model.system import DataSource, DataSourceParam
from watchmen_utilities import ArrayHelper, is_blank
from .secrets_manager import SecretsManger
from .storage_spi import StorageSPI, TopicDataStorageSPI

# database connection information
HOST = "host"
PORT = "port"
USERNAME = "username"
PASSWORD = "password"
NAME = "name"

# datasource params of secret manger
SECRET_TYPE = "secret_type"
AWS_REGION_NAME = "region_name"
AWS_ACCESS_KEY_ID = "access_key_id"
AWS_ACCESS_SECRET_ID = "access_secret_id"
SECRET_ID = "secret_id"

SECRET_MANGER_KEY = [HOST, PORT, USERNAME, PASSWORD, NAME, SECRET_TYPE, AWS_REGION_NAME, AWS_ACCESS_KEY_ID, AWS_ACCESS_SECRET_ID, SECRET_ID]
CONNECTION_INFO_KEY = [HOST, PORT, USERNAME, PASSWORD, NAME]


class SecretType(str, Enum):
	AWS = 'aws'
	ALIYUN = 'aliyun'
	AZURE = 'azure'


class EngineParams(BaseModel):
	host: str
	port: str
	username: str
	password: str
	name: str
	params: List[DataSourceParam] = None


def redress_url(value: str) -> str:
	if value is None:
		return ''
	else:
		return value.strip()


def use_secret(data_source_params: Optional[List[DataSourceParam]]) -> bool:
	return ArrayHelper(data_source_params).find(lambda x: x.name == SECRET_TYPE and x.value is not None) is not None


def ask_secret(data_source_params: Optional[List[DataSourceParam]]) -> Dict:
	return build_secrets_manager(data_source_params).ask_secrets(
		ArrayHelper(data_source_params).find(lambda x: x.name == SECRET_ID).value)


def redress_engine_params(data_source: DataSource) -> EngineParams:
	if use_secret(data_source.params):
		secrets = ask_secret(data_source.params)
		return EngineParams(
			params=ArrayHelper(data_source.params).filter(lambda x: x.name not in SECRET_MANGER_KEY).to_list(),
			**ArrayHelper(data_source.params).filter(lambda x: x.name in CONNECTION_INFO_KEY).to_map(lambda x: x.name,
			                                                                                         lambda x: secrets.get(x.value)))
	else:
		return EngineParams(host=data_source.host,
		                    port=data_source.port,
		                    username=data_source.username,
		                    password=data_source.password,
		                    name=data_source.name,
		                    params=data_source.params)


def ask_datasource_name(data_source: DataSource) -> str:
	return redress_engine_params(data_source).name


class DataSourceHelper:

	def __init__(self, data_source: DataSource):
		self.dataSource = data_source

	@abstractmethod
	def acquire_storage(self) -> StorageSPI:
		pass

	@abstractmethod
	def acquire_topic_data_storage(self) -> TopicDataStorageSPI:
		pass

	@staticmethod
	@abstractmethod
	def acquire_engine_by_url(url: str, params: Any) -> Any:
		pass

	@staticmethod
	@abstractmethod
	def acquire_engine_by_params(username: str, password: str, host: str, port: str, name: str,
	                             data_source_params: Optional[List[DataSourceParam]],
	                             params: Any) -> Any:
		pass

	def ask_acquire_engine_by_url(self) -> Callable[[str, List[Any]], Any]:
		return self.acquire_engine_by_url

	def ask_acquire_engine_by_params(self) -> Callable[[str, str, str, str, str, List[DataSourceParam], Any], Any]:
		return self.acquire_engine_by_params

	def acquire_engine(self, params: Any) -> Any:
		data_source = self.dataSource
		url = redress_url(data_source.url)
		if len(url) != 0:
			return self.ask_acquire_engine_by_url()(url, params)
		else:
			engine_params = redress_engine_params(data_source)
			return self.ask_acquire_engine_by_params()(
				engine_params.username, engine_params.password,
				engine_params.host, engine_params.port,
				engine_params.name,
				engine_params.params,
				params
			)


def build_secrets_manager(data_source_params: Optional[List[DataSourceParam]]) -> SecretsManger:
	secret_params = ArrayHelper(data_source_params).filter(lambda x: x.name in SECRET_MANGER_KEY).to_map(lambda x: x.name,
	                                                                                                  lambda x: x.value)
	if secret_params.get(SECRET_TYPE) == SecretType.AWS:
		from .secrets_manager_aws import AmazonSecretsManger
		return AmazonSecretsManger(secret_params.get(AWS_REGION_NAME),
		                           secret_params.get(AWS_ACCESS_KEY_ID),
		                           secret_params.get(AWS_ACCESS_SECRET_ID))
	if secret_params.get(SECRET_TYPE) == SecretType.ALIYUN:
		pass  # todo
	if secret_params.get(SECRET_TYPE) == SecretType.AZURE:
		pass  # todo
	raise NotImplementedError(f'Secret type {secret_params.get(SECRET_TYPE)} is not supported yet.')


def build_aws_secrets_manager(region_name: str,
                              access_key_id: str = None,
                              access_secret_id: str = None) -> SecretsManger:
	if is_blank(region_name):
		raise ValueError(f'region name can not be blank')

	from .secrets_manager_aws import AmazonSecretsManger
	return AmazonSecretsManger(region_name, access_key_id, access_secret_id)


def build_aliyun_secrets_manager(region_name: str,
                                 access_key_id: str = None,
                                 access_secret_id: str = None) -> SecretsManger:
	pass


def build_azure_secrets_manager(region_name: str,
                                access_key_id: str = None,
                                access_secret_id: str = None) -> SecretsManger:
	pass
