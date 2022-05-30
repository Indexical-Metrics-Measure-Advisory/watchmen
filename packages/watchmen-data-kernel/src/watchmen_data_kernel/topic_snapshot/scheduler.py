from typing import Dict, Optional

from apscheduler.job import Job
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from watchmen_model.admin import TopicSnapshotSchedulerId


class TopicSnapshotJobs:
	def __init__(self):
		self.scheduler = None
		self.jobs: Dict[TopicSnapshotSchedulerId, Job] = {}

	def put_scheduler(self, scheduler: AsyncIOScheduler) -> None:
		self.scheduler = scheduler

	def get_scheduler(self) -> AsyncIOScheduler:
		return self.scheduler

	def put_job(self, scheduler_id: TopicSnapshotSchedulerId, job: Job) -> None:
		self.jobs[scheduler_id] = job

	def get_job(self, scheduler_id: TopicSnapshotSchedulerId) -> Optional[Job]:
		return self.jobs.get(scheduler_id)

	def remove_job(self, scheduler_id: TopicSnapshotSchedulerId) -> Optional[Job]:
		job = self.get_job(scheduler_id)
		if job is not None:
			job.remove()
		return job


topic_snapshot_jobs = TopicSnapshotJobs()
