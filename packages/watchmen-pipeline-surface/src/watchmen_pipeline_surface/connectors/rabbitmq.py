from asyncio import ensure_future, get_event_loop
from json import loads
from logging import getLogger

from watchmen_model.common import SettingsModel
from watchmen_model.pipeline_kernel import PipelineTriggerDataWithPAT
from .handler import handle_trigger_data

log = getLogger(__name__)


class RabbitmqSettings(SettingsModel):
	host: str
	port: int
	virtualHost: str
	username: str
	password: str
	queue: str
	durable: bool
	autoDelete: bool


async def consume(loop, settings: RabbitmqSettings):
	from aio_pika import connect, ExchangeType
	connection = await connect(
		host=settings.host,
		port=settings.port,
		loop=loop,
		virtualhost=settings.virtualHost,
		login=settings.username,
		password=settings.password
	)

	async with connection:
		queue_name = settings.queue

		channel = await connection.channel()

		queue = await channel.declare_queue(
			queue_name,
			durable=settings.durable,
			auto_delete=settings.autoDelete
		)
		exchange = await channel.declare_exchange(name=queue_name, type=ExchangeType.DIRECT, auto_delete=True)

		await queue.bind(exchange, queue_name)
		# Creating channel
		async with queue.iterator() as queue_iter:
			try:
				async for message in queue_iter:
					# noinspection PyUnresolvedReferences
					async with message.process():
						# noinspection PyUnresolvedReferences
						payload = loads(message.body)
						trigger_data = PipelineTriggerDataWithPAT.parse_obj(payload)
						await handle_trigger_data(trigger_data)
			except Exception as e:
				log.error(e, exc_info=True, stack_info=True)
				await consume(loop, settings)
	pass


def init_rabbitmq(settings: RabbitmqSettings):
	ensure_future(consume(get_event_loop(), settings))
