from typing import List, Optional

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

from watchmen_model.common import DataModel
from watchmen_model.system import DataSource, DataSourceParam
from watchmen_storage import DataSourceHelper
from watchmen_utilities import ArrayHelper, is_blank, is_not_blank, serialize_to_json
from .storage_mysql import StorageMySQL, TopicDataStorageMySQL

MYSQL_URL_SEARCH_PARAMS_KEY = ['charset', 'ssl_ca', 'ssl_cert', 'ssl_key']


def redress_url_by_pymysql(url: str) -> str:
    if url.startswith('mysql://'):
        return url.replace('mysql://', 'mysql+pymysql://')
    else:
        return url


class MySQLDataSourceParams(DataModel):
    echo: bool = False
    poolRecycle: int = 3600


class MySQLDataSourceHelper(DataSourceHelper):
    def __init__(self, data_source: DataSource, params: MySQLDataSourceParams = MySQLDataSourceParams()):
        super().__init__(data_source)
        self.engine = self.acquire_engine(params)
    
    @staticmethod
    def acquire_engine_by_url(url: str, params: MySQLDataSourceParams) -> Engine:
        return create_engine(
            redress_url_by_pymysql(url),
            echo=params.echo,
            future=True,
            pool_recycle=params.poolRecycle,
            json_serializer=serialize_to_json,
            pool_pre_ping=True
        )
    
    # noinspection DuplicatedCode
    @staticmethod
    def find_param(params: Optional[List[DataSourceParam]], key: str) -> Optional[str]:
        if params is None:
            return None
        
        for param in params:
            if is_not_blank(param.name) and param.name.strip().lower() == key:
                value = param.value
                if is_not_blank(value):
                    return value.strip()
        return None
    
    @staticmethod
    def append_param(params: Optional[List[DataSourceParam]], key: str, value: str) -> List[DataSourceParam]:
        if params is None:
            params = []
        params.append(DataSourceParam(name=key, value=value))
        return params
    
    @staticmethod
    def build_url_search(params: Optional[List[DataSourceParam]]) -> str:
        if params is None:
            return ''
        else:
            return ArrayHelper(params).map(lambda param: f'{param.name}={param.value}').join('&')
    
    @staticmethod
    def acquire_engine_by_params(
            username: str, password: str, host: str, port: str, name: str,
            data_source_params: Optional[List[DataSourceParam]],
            params: MySQLDataSourceParams
    ) -> Engine:
        url_params = MySQLDataSourceHelper.build_url_params(data_source_params)
        search = MySQLDataSourceHelper.build_url_search(url_params)
        if is_not_blank(search):
            search = f'?{search}'
        url = f'mysql+pymysql://{username}:{password}@{host}:{port}/{name}{search}'
        return MySQLDataSourceHelper.acquire_engine_by_url(url, params)
    
    @staticmethod
    def build_url_params(data_source_params: Optional[List[DataSourceParam]]) -> Optional[List[DataSourceParam]]:
        url_params = []
        
        def filter_param(param: DataSourceParam):
            if param.name in MYSQL_URL_SEARCH_PARAMS_KEY:
                url_params.append(param)
        
        ArrayHelper(data_source_params).each(lambda param: filter_param(param))
        
        charset = MySQLDataSourceHelper.find_param(url_params, 'charset')
        if is_blank(charset):
            url_params = MySQLDataSourceHelper.append_param(url_params, 'charset', 'utf8')
        
        return url_params
    
    def acquire_storage(self) -> StorageMySQL:
        return StorageMySQL(self.engine)
    
    def acquire_topic_data_storage(self) -> TopicDataStorageMySQL:
        return TopicDataStorageMySQL(self.engine)
