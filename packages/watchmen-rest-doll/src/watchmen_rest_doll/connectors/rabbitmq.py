from asyncio import ensure_future, get_event_loop
from json import loads
from logging import getLogger

from watchmen_model.common import SettingsModel
from watchmen_model.kernal import TopicData

log = getLogger(__name__)


class RabbitmqSettings(SettingsModel):
	host: str
	port: int
	virtual_host: str
	username: str
	password: str
	queue: str
	durable: bool
	auto_delete: bool


async def consume(loop, settings: RabbitmqSettings):
	from aio_pika import connect, ExchangeType
	connection = await connect(
		host=settings.host,
		port=settings.port,
		loop=loop,
		virtualhost=settings.virtual_host,
		login=settings.username,
		password=settings.password
	)

	async with connection:
		queue_name = settings.queue

		channel = await connection.channel()

		queue = await channel.declare_queue(
			queue_name,
			durable=settings.durable,
			auto_delete=settings.auto_delete
		)
		exchange = await channel.declare_exchange(name=queue_name, type=ExchangeType.DIRECT, auto_delete=True)

		await queue.bind(exchange, queue_name)
		# Creating channel
		async with queue.iterator() as queue_iter:
			try:
				async for message in queue_iter:
					async with message.process():
						payload = loads(message.body)
						topic_event = TopicData.parse_obj(payload)
			# if topic_event.user is None:
			# 	user = load_user_by_name(settings.MOCK_USER)
			# 	log.warning("user is mock user , pls check user in topic_event")
			# else:
			# 	user = load_user_by_name(topic_event.user)

			# await import_raw_topic_data(topic_event, user)
			except Exception as e:
				log.error(e, exc_info=True, stack_info=True)
				await consume(loop, settings)
	# TODO init rabbitmq connector
	pass


def init_rabbitmq(settings: RabbitmqSettings):
	ensure_future(consume(get_event_loop(), settings))
