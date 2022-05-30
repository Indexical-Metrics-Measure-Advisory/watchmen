from watchmen_meta.common import ask_snowflake_generator
from watchmen_model.admin import TopicSnapshotScheduler
from .runner import create_job
from .scheduler import topic_snapshot_jobs


def register_topic_snapshot_job(scheduler: TopicSnapshotScheduler) -> None:
	scheduler_id = scheduler.schedulerId
	topic_snapshot_jobs.remove_job(scheduler_id)
	job = create_job(topic_snapshot_jobs.get_scheduler(), scheduler, ask_snowflake_generator())
	if job is not None:
		topic_snapshot_jobs.put_job(scheduler_id, job)
