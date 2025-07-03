from typing import List, Optional, Callable, Dict

from boto3 import client, resource

from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator, ask_super_admin
from watchmen_model.common import DataModel, TenantId
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_serverless_lambda.cache import LambdaCacheService
from watchmen_storage import ask_s3_bucket_auth_iam_enable, DataSourceHelper, StorageSPI, TopicDataStorageSPI
from watchmen_storage_s3 import SimpleStorageService
from watchmen_meta.system import DataSourceService as DataSourceStorageService
from watchmen_utilities import ArrayHelper, serialize_to_json


class S3Params(DataModel):
    echo: bool = False
    poolRecycle: int = 3600


class S3Engine:
    def __init__(self, access_key_id: str, access_key_secret: str, endpoint: str, bucket_name: str,
                 params: Optional[List[DataSourceParam]]):
        self.access_key_id = access_key_id
        self.access_key_secret = access_key_secret
        self.bucket_name = bucket_name
        self.params = params
        self.client = self.get_client(access_key_id, access_key_secret, endpoint)
        self.resource = self.get_resource(access_key_id, access_key_secret, endpoint)
    
    def get_client(self, access_key_id: str, access_key_secret: str, endpoint: str) -> client:
        if ask_s3_bucket_auth_iam_enable():
            return client(
                service_name='s3',
                region_name=endpoint
            )
        else:
            return client(
                service_name='s3',
                region_name=endpoint,
                aws_access_key_id=access_key_id,
                aws_secret_access_key=access_key_secret
            )
    
    def get_resource(self, access_key_id: str, access_key_secret: str, endpoint: str) -> resource:
        if ask_s3_bucket_auth_iam_enable():
            return resource(
                service_name='s3',
                region_name=endpoint
            )
        else:
            return resource(
                service_name='s3',
                region_name=endpoint,
                aws_access_key_id=access_key_id,
                aws_secret_access_key=access_key_secret)

    def put_object(self, key: str, data: Dict) -> None:
        self.client.put_object(Body=serialize_to_json(data), Bucket=self.bucket_name, Key=key)


class LogStorageS3:
    def __init__(self, engine: S3Engine):
        self.engine = engine

    def upload_log_to_s3(self, key: str, entity:Dict):
        self.engine.put_object(key, entity)
    

class LogS3DataSourceHelper(DataSourceHelper):
    
    def __init__(self, data_source: DataSource, params: S3Params = S3Params()):
        super().__init__(data_source)
        self.engine = self.acquire_engine(params)
    
    @staticmethod
    def acquire_engine_by_url(url: str, params: S3Params) -> SimpleStorageService:
        raise NotImplementedError("s3 data source is not support url configuration")
    
    # noinspection PyUnusedLocal
    @staticmethod
    def acquire_engine_by_params(
            username: str, password: str, host: str, port: str, name: str,
            data_source_params: Optional[List[DataSourceParam]],
            params: S3Params
    ) -> S3Engine:
        return S3Engine(username, password, host, name, data_source_params)
    
    def acquire_storage(self) -> StorageSPI:
        raise NotImplementedError("log s3 data source is not support acquire storage")
    
    def acquire_topic_data_storage(self) -> TopicDataStorageSPI:
        raise NotImplementedError("log s3 data source is not support acquire topic data storage")
    
    def acquire_log_storage(self) -> LogStorageS3:
        return LogStorageS3(self.engine)


class LogS3Configuration:
    """
    configuration of oss storage
    """

    def __init__(self, data_source: DataSource):
        super().__init__()
        self.helper = LogS3DataSourceHelper(data_source)

    def create_storage(self) -> LogStorageS3:
        return self.helper.acquire_log_storage()


def build_log_s3_storage(data_source: DataSource) -> Callable[[], LogStorageS3]:
    configuration = LogS3Configuration(data_source)
    return lambda: configuration.create_storage()


def ask_log_storage(tenant_id: str) -> Optional[LogStorageS3]:
    
    def filter_datasource(datasource: DataSource) -> bool:
        if datasource.params:
            for param in datasource.params:
                if param.name == "log" and param.value:
                    return True
        return False
    
    data_source: DataSource = find_datasource_by_tenant_id(tenant_id, filter_datasource)
    if data_source:
        build = LambdaCacheService.log_data_source().get_builder_by_data_source_id(data_source.data_source_id)
        if build is not None:
            return build()
        
        
        build = build_log_s3_storage(data_source)
        LambdaCacheService.log_data_source().put_builder_by_data_source_id(data_source.data_source_id, build)
        return build()
    else:
        return None


def find_datasource_by_tenant_id(tenant_id: TenantId, filter_: Callable[[DataSource], bool]) -> Optional[DataSource]:
    data_source = LambdaCacheService.log_data_source().get_datasource_by_tenant_id(tenant_id)
    if data_source is not None:
        return data_source
    
    storage_service = DataSourceStorageService(
        ask_meta_storage(), ask_snowflake_generator(), ask_super_admin())
    storage_service.begin_transaction()
    try:
        # noinspection PyTypeChecker
        data_sources: List[DataSource] = storage_service.find_all(tenant_id)
        data_source: DataSource = ArrayHelper(data_sources).find(filter_)
        
        if data_source is None:
            return None
        
        LambdaCacheService.log_data_source().put_datasource_by_tenant_id(data_source)
        return data_source
    finally:
        storage_service.close_transaction()