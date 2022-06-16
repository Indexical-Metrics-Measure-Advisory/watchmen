from typing import Dict, List, Optional

from apscheduler.job import Job
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from watchmen_model.admin import TopicSnapshotSchedulerId
from watchmen_utilities import ArrayHelper


class TopicSnapshotJobs:
	def __init__(self):
		self.scheduler = None
		self.jobs: Dict[TopicSnapshotSchedulerId, Job] = {}
		self.jobVersions: Dict[TopicSnapshotSchedulerId, int] = {}

	def put_scheduler(self, scheduler: AsyncIOScheduler) -> None:
		self.scheduler = scheduler

	def get_scheduler(self) -> AsyncIOScheduler:
		return self.scheduler

	def put_job(self, scheduler_id: TopicSnapshotSchedulerId, version: int, job: Job) -> None:
		self.jobs[scheduler_id] = job
		self.jobVersions[scheduler_id] = version

	def get_job(self, scheduler_id: TopicSnapshotSchedulerId) -> Optional[Job]:
		return self.jobs.get(scheduler_id)

	def remove_job(self, scheduler_id: TopicSnapshotSchedulerId) -> Optional[Job]:
		job = self.get_job(scheduler_id)
		if job is not None:
			job.remove()
			if scheduler_id in self.jobs:
				del self.jobs[scheduler_id]
			if scheduler_id in self.jobVersions:
				del self.jobVersions[scheduler_id]
		return job

	def clear_jobs(self) -> None:
		# noinspection PyUnresolvedReferences
		ArrayHelper(list(self.jobs.keys()).each(lambda x: self.remove_job(x)))
		self.jobs.clear()
		self.jobVersions.clear()

	def should_put_job(self, scheduler_id: TopicSnapshotSchedulerId, version: int) -> bool:
		if scheduler_id not in self.jobs:
			return True

		existing_version = self.jobVersions.get(scheduler_id)
		if existing_version is None:
			return True

		return existing_version < version

	def remove_jobs_but(self, scheduler_ids: List[TopicSnapshotSchedulerId]) -> None:
		ArrayHelper(list(self.jobs.keys())) \
			.filter(lambda x: x not in scheduler_ids) \
			.each(lambda x: self.remove_job(x))


topic_snapshot_jobs = TopicSnapshotJobs()
