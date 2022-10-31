from abc import abstractmethod
from typing import Optional, List, Tuple, Dict

from watchmen_model.system import DataSource, DataSourceParam
from watchmen_utilities import ArrayHelper
from .secrets_manager import SecretType, SecretsManger, AmazonSecretsManger
from .storage_spi import StorageSPI, TopicDataStorageSPI


# database connection information
HOST = "host"
PORT = "port"
USERNAME = "username"
PASSWORD = "password"
NAME = "name"
URL = "url"

# datasource params of secret manger
SECRET_TYPE = "secret_type"
REGION_NAME = "region_name"
ACCESS_KEY_ID = "access_key_id"
ACCESS_SECRET_ID = "access_secret_id"
SECRET_ID = "secret_id"


CHECK_LIST = [HOST, PORT, USERNAME, PASSWORD, NAME, URL, SECRET_TYPE, REGION_NAME, ACCESS_KEY_ID, ACCESS_SECRET_ID, SECRET_ID]


class DataSourceHelper:
	def __init__(self, data_source: DataSource):
		self.dataSource = data_source

	@abstractmethod
	def acquire_storage(self) -> StorageSPI:
		pass

	@abstractmethod
	def acquire_topic_data_storage(self) -> TopicDataStorageSPI:
		pass


def secret_used(data_source_params: Optional[List[DataSourceParam]]) -> bool:
	if data_source_params is None:
		return False
	
	for param in data_source_params:
		if param.name == SECRET_TYPE and param.value is not None:
			return True
	return False


def ask_secrets(data_source_params: Optional[List[DataSourceParam]]) -> Dict:
	params = param_to_dict(data_source_params)
	return build_secrets_manager(**params).ask_secrets(params.get(SECRET_ID))


def param_to_dict(data_source_params: Optional[List[DataSourceParam]]) -> Dict:
	result = {}
	for param in data_source_params:
		if param.name in CHECK_LIST:
			result[param.name] = param.value
	return result


def build_secrets_manager(**kwargs) -> SecretsManger:
	if kwargs.get(SECRET_TYPE) == SecretType.AWS:
		return AmazonSecretsManger(kwargs.get(REGION_NAME),
		                           kwargs.get(ACCESS_KEY_ID),
		                           kwargs.get(ACCESS_SECRET_ID))
	if kwargs.get(SECRET_TYPE) == SecretType.ALIYUN:
		pass  # todo
	if kwargs.get(SECRET_TYPE) == SecretType.AZURE:
		pass  # todo
	raise NotImplementedError(f'Secret type {kwargs.get(SECRET_TYPE)} is not supported yet.')


def remove_params(data_source_params: Optional[List[DataSourceParam]]) -> Optional[List[DataSourceParam]]:
	
	def check_params(param: DataSourceParam) -> bool:
		if param.name in CHECK_LIST:
			return False
		else:
			return True
	
	return ArrayHelper(data_source_params).filter(lambda x: check_params(x)).to_list()


def ask_config_from_secret_value(secrets: Dict, data_source_params: Optional[List[DataSourceParam]]) -> Tuple:
	host, port, username, password, name = secrets.get(HOST), secrets.get(PORT), \
	                                       secrets.get(USERNAME), secrets.get(PASSWORD), \
	                                       secrets.get(NAME)
	for param in data_source_params:
		if param.name == HOST:
			host = secrets.get(param.value)
		if param.name == PORT:
			port = secrets.get(param.value)
		if param.name == USERNAME:
			username = secrets.get(param.value)
		if param.name == PASSWORD:
			password = secrets.get(param.value)
		if param.name == NAME:
			name = secrets.get(param.value)
	return host, port, username, password, name
