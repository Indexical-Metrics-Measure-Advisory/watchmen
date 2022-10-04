from logging import getLogger

from pydantic import BaseSettings

from watchmen_utilities import is_blank
from .connectors import KafkaSettings, RabbitmqSettings

logger = getLogger(__name__)


class PipelineSurfaceSettings(BaseSettings):
	RABBITMQ_CONNECTOR: bool = False
	RABBITMQ_HOST: str = ''
	RABBITMQ_PORT: str = '5672'
	RABBITMQ_USERNAME: str = ''
	RABBITMQ_PASSWORD: str = ''
	RABBITMQ_VIRTUALHOST: str = ''
	RABBITMQ_QUEUE: str = ''
	RABBITMQ_DURABLE: bool = True
	RABBITMQ_AUTO_DELETE: bool = False
	
	KAFKA_CONNECTOR: bool = False
	KAFKA_BOOTSTRAP_SERVER: str = 'localhost:9092'
	KAFKA_TOPICS: str = ''
	
	S3_COLLECTOR_CONNECTOR: bool = False
	S3_COLLECTOR_ACCESS_KEY_ID: str = None
	S3_COLLECTOR_SECRET_ACCESS_KEY: str = None
	S3_COLLECTOR_BUCKET_NAME: str = ''
	S3_COLLECTOR_REGION: str = ''
	S3_COLLECTOR_TOKEN: str = ''
	S3_COLLECTOR_TENANT: int = 0
	S3_COLLECTOR_CONSUME_PREFIX = ''
	S3_COLLECTOR_DEAD_PREFIX = ''
	S3_COLLECTOR_MAX_KEYS: int = 10
	S3_COLLECTOR_CLEAN_TASK_INTERVAL: int = 3600
	
	class Config:
		# secrets_dir = '/var/run'
		env_file = '.env'
		env_file_encoding = 'utf-8'
		case_sensitive = True


settings = PipelineSurfaceSettings()
logger.info(f'Pipeline surface settings[{settings.dict()}].')


def ask_kafka_connector_enabled() -> bool:
	return settings.KAFKA_CONNECTOR


def ask_kafka_connector_settings() -> KafkaSettings:
	topics = settings.KAFKA_TOPICS
	if is_blank(topics):
		topics = []
	else:
		topics = topics.split(',')
	return KafkaSettings(
		bootstrapServers=settings.KAFKA_BOOTSTRAP_SERVER,
		topics=topics
	)


def ask_rabbitmq_connector_enabled() -> bool:
	return settings.RABBITMQ_CONNECTOR


def ask_rabbitmq_connector_settings() -> RabbitmqSettings:
	return RabbitmqSettings(
		host=settings.RABBITMQ_HOST,
		port=settings.RABBITMQ_PORT,
		virtualHost=settings.RABBITMQ_VIRTUALHOST,
		username=settings.RABBITMQ_USERNAME,
		password=settings.RABBITMQ_PASSWORD,
		queue=settings.RABBITMQ_QUEUE,
		durable=settings.RABBITMQ_DURABLE,
		autoDelete=settings.RABBITMQ_AUTO_DELETE
	)


def ask_s3_connector_enabled() -> bool:
	return settings.S3_COLLECTOR_CONNECTOR


def ask_s3_connector_settings():
	from watchmen_collector_kernel.common import S3CollectorSettings
	
	def get_s3_collector_settings() -> S3CollectorSettings:
		return S3CollectorSettings(
			access_key_id=settings.S3_COLLECTOR_ACCESS_KEY_ID,
			secret_access_key=settings.S3_COLLECTOR_SECRET_ACCESS_KEY,
			bucket_name=settings.S3_COLLECTOR_BUCKET_NAME,
			region=settings.S3_COLLECTOR_REGION,
			token=settings.S3_COLLECTOR_TOKEN,
			tenant_id=settings.S3_COLLECTOR_TENANT,
			consume_prefix=settings.S3_COLLECTOR_CONSUME_PREFIX,
			dead_prefix=settings.S3_COLLECTOR_DEAD_PREFIX,
			max_keys=settings.S3_COLLECTOR_MAX_KEYS,
			clean_task_interval=settings.S3_COLLECTOR_CLEAN_TASK_INTERVAL
		)
	
	return get_s3_collector_settings()
