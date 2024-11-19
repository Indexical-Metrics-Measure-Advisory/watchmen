from logging import getLogger

from watchmen_utilities import ExtendedBaseSettings

from watchmen_utilities import is_blank
from .connectors import KafkaSettings, RabbitmqSettings

logger = getLogger(__name__)


class PipelineSurfaceSettings(ExtendedBaseSettings):
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


settings = PipelineSurfaceSettings()
# logger.info(f'Pipeline surface settings[{settings.dict()}].')


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
