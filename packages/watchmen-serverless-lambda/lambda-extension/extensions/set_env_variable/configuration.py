
from enum import Enum
from logging import getLogger

from pydantic_settings import BaseSettings
from sqlalchemy import Engine, create_engine, NullPool
from watchmen_utilities import serialize_to_json, is_not_blank
from cx_Oracle import init_oracle_client, makedsn, SessionPool, SPOOL_ATTRVAL_WAIT
import urllib.parse

init_oracle_client(lib_dir=r"/opt/oracle/instantclient_21_3")

logger = getLogger(__name__)

class DataSourceType(str, Enum):
    MYSQL = 'mysql',
    ORACLE = 'oracle',
    MSSQL = 'mssql',
    POSTGRESQL = 'postgresql'


class ExtendedBaseSettings(BaseSettings):
    class Config:
        # secrets_dir = '/var/run'
        env_file = '.env'
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = 'ignore'


class DataBaseSettings(ExtendedBaseSettings):
    META_STORAGE_TYPE: DataSourceType = DataSourceType.MYSQL
    META_STORAGE_USER_NAME: str = 'watchmen'
    META_STORAGE_PASSWORD: str = 'watchmen'
    META_STORAGE_HOST: str = 'localhost'
    META_STORAGE_PORT: int = 3306
    META_STORAGE_NAME: str = 'watchmen'
    META_STORAGE_ECHO: bool = False
    META_STORAGE_SSL: bool = False
    
    META_STORAGE_SSL_CA: str = ""
    META_STORAGE_SSL_CLIENT_CERT: str = ""
    META_STORAGE_SSL_CLIENT_KEY: str = ""
    
    META_STORAGE_SID: str = ""
    SNOWFLAKE_COMPETITIVE_WORKERS_V2: bool = False
    
settings = DataBaseSettings()
logger.debug(f'Database settings[{settings.dict()}].')


def get_engine() -> Engine:
    
    storage_type = settings.META_STORAGE_TYPE
    username = settings.META_STORAGE_USER_NAME
    password = settings.META_STORAGE_PASSWORD
    host = settings.META_STORAGE_HOST
    port = settings.META_STORAGE_PORT
    dbname = settings.META_STORAGE_NAME
    echo = settings.META_STORAGE_ECHO
    sslEnabled = settings.META_STORAGE_SSL
    poolRecycle = 3600
    
    if storage_type == DataSourceType.MYSQL:
        if sslEnabled:
            search = f"ssl_ca={settings.META_STORAGE_SSL_CA}&ssl_cert={settings.META_STORAGE_SSL_CLIENT_CERT}&ssl_key={settings.META_STORAGE_SSL_CLIENT_KEY}"
            url = f'mysql+pymysql://{username}:{password}@{host}:{port}/{dbname}?charset=utf8&{search}'
        else:
            url = f'mysql+pymysql://{username}:{password}@{host}:{port}/{dbname}?charset=utf8'
        return create_engine(
            url,
            echo=echo,
            future=True,
            pool_recycle=poolRecycle,
            json_serializer=serialize_to_json,
            pool_pre_ping=True
        )

    if settings.META_STORAGE_TYPE == DataSourceType.POSTGRESQL:
        url = f'postgresql+psycopg2://{username}:{password}@{host}:{port}/{dbname}?client_encoding=utf8'
        return create_engine(
            url,
            echo=echo,
            future=True,
            pool_recycle=poolRecycle,
            json_serializer=serialize_to_json,
            supports_native_boolean=False
        )
    
    if settings.META_STORAGE_TYPE == DataSourceType.MSSQL:
        encoded_password = urllib.parse.quote_plus(password)
        url = f'mssql+pyodbc://{username}:{encoded_password}@{host}:{port}/{dbname}?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes'
        return create_engine(
            url,
            echo=echo,
            future=True,
            pool_recycle=poolRecycle,
            json_serializer=serialize_to_json
        )
    

    if storage_type == DataSourceType.ORACLE:
        if sslEnabled:
            sid = settings.META_STORAGE_SID
            dsn = (f"(DESCRIPTION = (ADDRESS_LIST = (ADDRESS = (PROTOCOL = TCPS) (HOST = {host}) (PORT = {port}) ) ) ("
                   f"CONNECT_DATA = (SID = {sid}) ) )")
        else:
            sid = settings.META_STORAGE_SID
            if sid is not None:
                dsn = makedsn(host, port, sid=sid)
            elif is_not_blank(dbname):
                dsn = makedsn(host, port, service_name=dbname)
            else:
                service_name = settings.META_STORAGE_NAME
                if service_name is not None:
                    dsn = makedsn(host, port, service_name=service_name)
                else:
                    raise Exception(
                        f'Neither sid nor service_name exists, check oracle configuration please.')
        pool_size = 3
        
        pool = SessionPool(
            user=username, password=password, dsn=dsn,
            min=pool_size, max=pool_size, increment=0, getmode=SPOOL_ATTRVAL_WAIT,
            encoding='UTF-8')
        
        return create_engine(
            'oracle+cx_oracle://', creator=pool.acquire,
            poolclass=NullPool, coerce_to_decimal=False, echo=echo, optimize_limits=True,
            future=True)
    
    raise Exception(f'Database storage type[{storage_type}] is not supported yet.')