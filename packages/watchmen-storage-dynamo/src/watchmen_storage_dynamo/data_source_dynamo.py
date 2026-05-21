from dataclasses import dataclass
from typing import Any, Optional

import boto3
from botocore.config import Config

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource
from watchmen_storage import DataSourceHelper
from .storage_dynamo import StorageDynamo, TopicDataStorageDynamo

REGION_NAME = 'region_name'
ENDPOINT_URL = 'endpoint_url'
ACCESS_KEY_ID = 'access_key_id'
SECRET_ACCESS_KEY = 'secret_access_key'
TABLE_PREFIX = 'table_prefix'
READ_TIMEOUT = 'read_timeout'
CONNECT_TIMEOUT = 'connect_timeout'
MAX_ATTEMPTS = 'max_attempts'
CONSISTENT_READ = 'consistent_read'
TABLE_BILLING_MODE = 'table_billing_mode'


@dataclass
class DynamoEngine:
	resource: Any
	client: Any
	table_prefix: str = ''
	consistent_read: bool = False
	table_billing_mode: str = 'PROVISIONED'


class DynamoDataSourceParams(DataModel):
	echo: bool = False
	regionName: str = 'us-east-1'
	endpointUrl: Optional[str] = None
	tablePrefix: Optional[str] = None
	readTimeout: Optional[int] = None
	connectTimeout: Optional[int] = None
	maxAttempts: Optional[int] = None
	consistentRead: bool = False
	tableBillingMode: Optional[str] = None


def build_client_config(params: DynamoDataSourceParams, data_source_params) -> Config:
	read_timeout = DataSourceHelper.find_param(data_source_params, READ_TIMEOUT) or params.readTimeout
	connect_timeout = DataSourceHelper.find_param(data_source_params, CONNECT_TIMEOUT) or params.connectTimeout
	max_attempts = DataSourceHelper.find_param(data_source_params, MAX_ATTEMPTS) or params.maxAttempts
	config_kwargs = {}
	if connect_timeout is not None:
		config_kwargs['connect_timeout'] = int(connect_timeout)
	if read_timeout is not None:
		config_kwargs['read_timeout'] = int(read_timeout)
	if max_attempts is not None:
		config_kwargs['retries'] = {'max_attempts': int(max_attempts), 'mode': 'standard'}
	return Config(**config_kwargs)


class DynamoDataSourceHelper(DataSourceHelper):
	def __init__(self, data_source: DataSource, params: DynamoDataSourceParams = DynamoDataSourceParams()):
		super().__init__(data_source)
		self.engine = self.acquire_engine(params)

	@staticmethod
	def acquire_engine_by_url(url: str, params: DynamoDataSourceParams) -> DynamoEngine:
		session = boto3.session.Session(region_name=params.regionName)
		config = build_client_config(params, [])
		return DynamoEngine(
			resource=session.resource('dynamodb', endpoint_url=url, config=config),
			client=session.client('dynamodb', endpoint_url=url, config=config),
			table_prefix=params.tablePrefix or '',
			consistent_read=params.consistentRead,
			table_billing_mode=params.tableBillingMode or 'PROVISIONED'
		)

	@staticmethod
	def acquire_engine_by_params(
			username: str, password: str, host: str, port: str, name: str, data_source_params, params: DynamoDataSourceParams
	) -> DynamoEngine:
		region_name = DataSourceHelper.find_param(data_source_params, REGION_NAME) or params.regionName
		endpoint_url = DataSourceHelper.find_param(data_source_params, ENDPOINT_URL)
		if endpoint_url is None and host is not None:
			port_part = f':{port}' if port else ''
			endpoint_url = f'http://{host}{port_part}'
		access_key_id = DataSourceHelper.find_param(data_source_params, ACCESS_KEY_ID) or username or None
		secret_access_key = DataSourceHelper.find_param(data_source_params, SECRET_ACCESS_KEY) or password or None
		table_prefix = DataSourceHelper.find_param(data_source_params, TABLE_PREFIX) or params.tablePrefix or ''
		consistent_read = DataSourceHelper.find_param(data_source_params, CONSISTENT_READ)
		table_billing_mode = DataSourceHelper.find_param(data_source_params, TABLE_BILLING_MODE) \
			or params.tableBillingMode or 'PROVISIONED'
		session = boto3.session.Session(
			aws_access_key_id=access_key_id,
			aws_secret_access_key=secret_access_key,
			region_name=region_name
		)
		config = build_client_config(params, data_source_params)
		return DynamoEngine(
			resource=session.resource('dynamodb', endpoint_url=endpoint_url, config=config),
			client=session.client('dynamodb', endpoint_url=endpoint_url, config=config),
			table_prefix=table_prefix,
			consistent_read=str(consistent_read).lower() == 'true' if consistent_read is not None else params.consistentRead,
			table_billing_mode=str(table_billing_mode).upper()
		)

	def acquire_storage(self) -> StorageDynamo:
		return StorageDynamo(self.engine)

	def acquire_topic_data_storage(self) -> TopicDataStorageDynamo:
		return TopicDataStorageDynamo(self.engine)
