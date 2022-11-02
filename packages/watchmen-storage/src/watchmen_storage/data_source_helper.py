from abc import abstractmethod
from enum import Enum
from typing import Optional, List, Dict

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

AWS_SECRET_KEY = [HOST, PORT, USERNAME, PASSWORD, NAME, SECRET_TYPE, AWS_REGION_NAME, AWS_ACCESS_KEY_ID, AWS_ACCESS_SECRET_ID, SECRET_ID]


class SecretType(str, Enum):
	AWS = 'aws',
	ALIYUN = 'aliyun',
	AZURE = 'azure'


class RdsConnectionInfo(BaseModel):
	host: str
	port: str
	username: str
	password: str
	name: str
	params: List[DataSourceParam] = []


class DataSourceHelper:

	def __init__(self, data_source: DataSource):
		self.dataSource = data_source

	@abstractmethod
	def acquire_storage(self) -> StorageSPI:
		pass

	@abstractmethod
	def acquire_topic_data_storage(self) -> TopicDataStorageSPI:
		pass

	# noinspection PyMethodMayBeStatic
	def use_secret(self, data_source_params: Optional[List[DataSourceParam]]) -> bool:
		return ArrayHelper(data_source_params).find(lambda x: x.name == SECRET_TYPE and x.value is not None) is not None

	# noinspection PyMethodMayBeStatic
	def ask_secret(self, data_source_params: Optional[List[DataSourceParam]]) -> Dict:
		return build_secrets_manager(data_source_params).ask_secrets(
			ArrayHelper(data_source_params).find(lambda x: x.name == SECRET_ID).value)

	def ask_config_from_secret_value(self, data_source_params: Optional[List[DataSourceParam]]) -> RdsConnectionInfo:
		secrets = self.ask_secret(data_source_params)
		CONNECTION_INFO_KEY = [HOST, PORT, USERNAME, PASSWORD, NAME]
		return RdsConnectionInfo(params=ArrayHelper(data_source_params).filter(lambda x: x.name not in AWS_SECRET_KEY).to_list(),
		                         **ArrayHelper(data_source_params)
		                         .filter(lambda x: x.name in CONNECTION_INFO_KEY)
		                         .to_map(lambda x: x.name, lambda x: secrets.get(x.value)))


def build_secrets_manager(data_source_params: Optional[List[DataSourceParam]]) -> SecretsManger:
	secret_params = ArrayHelper(data_source_params).filter(lambda x: x.name in AWS_SECRET_KEY).to_map(lambda x: x.name,
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
