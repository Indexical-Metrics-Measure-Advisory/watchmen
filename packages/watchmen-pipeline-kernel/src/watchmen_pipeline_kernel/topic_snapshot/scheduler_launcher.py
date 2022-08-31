from logging import getLogger
from typing import List, Optional, Tuple

from apscheduler.job import Job
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from watchmen_auth import fake_super_admin, fake_tenant_admin, PrincipalService
from watchmen_data_kernel.common import ask_topic_snapshot_scheduler_heart_beat_interval
from watchmen_data_kernel.meta import TopicService
from watchmen_meta.admin import TopicSnapshotSchedulerService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, TopicKind, TopicSnapshotFrequency, TopicSnapshotScheduler
from watchmen_storage import SnowflakeGenerator
from watchmen_utilities import ArrayHelper, get_current_time_in_seconds, to_previous_month, to_previous_week, \
	to_yesterday
from .scheduler_registrar import topic_snapshot_jobs
from .scheduler_runner import run_job

logger = getLogger(__name__)


def get_topic_snapshot_scheduler_service(principal_service: PrincipalService) -> TopicSnapshotSchedulerService:
	return TopicSnapshotSchedulerService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_topic_service(principal_service: PrincipalService) -> TopicService:
	return TopicService(principal_service)


def find_enabled_jobs() -> List[TopicSnapshotScheduler]:
	scheduler_service = get_topic_snapshot_scheduler_service(fake_super_admin())
	scheduler_service.begin_transaction()
	try:
		return scheduler_service.find_all_enabled()
	except Exception as e:
		logger.error(e, exc_info=True, stack_info=True)
		return []
	finally:
		scheduler_service.close_transaction()


def create_job(
		ioScheduler: AsyncIOScheduler, scheduler: TopicSnapshotScheduler,
		snowflake_generator: SnowflakeGenerator
) -> Optional[Tuple[TopicSnapshotScheduler, Job]]:
	topic_id = scheduler.topicId
	if topic_id is None:
		logger.error(
			f'Cannot create job for scheduler[schedulerId={scheduler.schedulerId}] because of topic not declared.')
		return None
	principal_service = fake_tenant_admin(scheduler.tenantId)
	topic: Optional[Topic] = get_topic_service(principal_service).find_by_id(topic_id)
	if topic.kind == TopicKind.SYNONYM:
		logger.error(f'Topic snapshot scheduler[id={scheduler.schedulerId}] cannot apply to synonym.')
		return None

	trigger = 'cron'
	hour = scheduler.hour
	minute = scheduler.minute

	if scheduler.frequency == TopicSnapshotFrequency.DAILY:
		def run() -> None:
			process_date = to_yesterday(get_current_time_in_seconds())
			run_job(scheduler.schedulerId, process_date)

		day_of_week = 'mon-sun'
		return scheduler, ioScheduler.add_job(
			run, trigger, day_of_week=day_of_week, hour=hour, minute=minute,
			id=str(snowflake_generator.next_id()))
	elif scheduler.frequency == TopicSnapshotFrequency.WEEKLY:
		def run() -> None:
			process_date = to_previous_week(get_current_time_in_seconds())
			run_job(scheduler.schedulerId, process_date)

		day_of_week = scheduler.weekday
		return scheduler, ioScheduler.add_job(
			run, trigger, day_of_week=day_of_week, hour=hour, minute=minute,
			id=str(snowflake_generator.next_id()))
	elif scheduler.frequency == TopicSnapshotFrequency.MONTHLY:
		def run() -> None:
			process_date = to_previous_month(get_current_time_in_seconds())
			run_job(scheduler.schedulerId, process_date)

		day = 'last' if scheduler.day == 'L' else scheduler.day
		return scheduler, ioScheduler.add_job(
			run, trigger, day=day, hour=hour, minute=minute,
			id=str(snowflake_generator.next_id()))
	else:
		logger.warning(
			f'Cannot create job for scheduler[schedulerId={scheduler.schedulerId}, frequency={scheduler.frequency}].')
		return None


def create_jobs(ioScheduler: AsyncIOScheduler) -> None:
	schedulers = find_enabled_jobs()
	snowflake_generator = ask_snowflake_generator()
	ArrayHelper(schedulers) \
		.map(lambda x: create_job(ioScheduler, x, snowflake_generator)) \
		.filter(lambda x: x is not None) \
		.each(lambda x: topic_snapshot_jobs.put_job(x[0].schedulerId, x[0].version, x[1]))


def create_scan_job(ioScheduler: AsyncIOScheduler) -> None:
	def run() -> None:
		snowflake_generator = ask_snowflake_generator()
		schedulers = find_enabled_jobs()
		# remove jobs which not exists in enabled schedulers
		scheduler_ids = ArrayHelper(schedulers).map(lambda x: x.schedulerId).to_list()
		topic_snapshot_jobs.remove_jobs_but(scheduler_ids)
		# replace jobs
		ArrayHelper(schedulers) \
			.filter(lambda x: topic_snapshot_jobs.should_put_job(x.schedulerId, x.version)) \
			.map(lambda x: create_job(ioScheduler, x, snowflake_generator)) \
			.filter(lambda x: x is not None) \
			.each(lambda x: topic_snapshot_jobs.put_job(x[0].schedulerId, x[0].version, x[1]))

	ioScheduler.add_job(run, 'interval', seconds=ask_topic_snapshot_scheduler_heart_beat_interval())


def create_periodic_topic_snapshot_jobs() -> None:
	scheduler = AsyncIOScheduler()
	create_jobs(scheduler)
	create_scan_job(scheduler)
	scheduler.start()
	topic_snapshot_jobs.put_scheduler(scheduler)
	logger.info("Periodic topic snapshot jobs started.")
