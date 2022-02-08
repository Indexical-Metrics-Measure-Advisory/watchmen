from asyncio import create_task, get_event_loop
from json import loads
from logging import getLogger
from typing import List

from watchmen_model.common import SettingsModel
from watchmen_model.reactor import TopicData

logger = getLogger(__name__)


class KafkaSettings(SettingsModel):
	bootstrap_servers: str = None
	topics: List[str] = []


async def import_raw_topic_data(topic_data: TopicData) -> None:
	# TODO consume topic data from kafka
	pass


async def consume(loop, settings: KafkaSettings):
	from aiokafka import AIOKafkaConsumer
	# noinspection PyTypeChecker
	consumer = AIOKafkaConsumer(
		settings.topics, loop=loop, bootstrap_servers=settings.bootstrap_servers,
		value_deserializer=lambda m: loads(m.decode('utf-8')))

	await consumer.start()
	try:
		async for msg in consumer:
			topic_data = TopicData.parse_obj(msg.value)
			await import_raw_topic_data(topic_data)
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		await consume(get_event_loop(), settings)
	finally:
		# Will leave consumer group; perform autocommit if enabled.
		await consumer.stop()
	pass


def init_kafka(settings: KafkaSettings) -> None:
	create_task(consume(get_event_loop(), settings))
