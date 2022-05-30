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

	def put_job(self, schedulerId: TopicSnapshotSchedulerId, job: Job) -> None:
		self.jobs[schedulerId] = job

	def get_job(self, schedulerId: TopicSnapshotSchedulerId) -> Optional[Job]:
		return self.jobs.get(schedulerId)


topic_snapshot_jobs = TopicSnapshotJobs()
