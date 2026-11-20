import hashlib
import json
import re
from datetime import date, datetime
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ..meta.common import value_of
from ..model.adapter import RunRequest
from ..model.task import ScheduleFrequency, ScheduleMode, TaskDefinition, TaskSchedule
from .exceptions import TaskValidationException

TIME_OF_DAY_PATTERN = re.compile(r'^([01]\d|2[0-3]):[0-5]\d$')


class TaskScheduleService:
	def validate(self, schedule: Optional[TaskSchedule]) -> None:
		if schedule is None:
			return
		try:
			ZoneInfo(schedule.timezone)
		except (ZoneInfoNotFoundError, ValueError) as e:
			raise TaskValidationException(f'Unknown schedule timezone: {schedule.timezone}.') from e
		frequency = value_of(schedule.frequency)
		if schedule.timeOfDay is not None and not TIME_OF_DAY_PATTERN.fullmatch(schedule.timeOfDay):
			raise TaskValidationException('timeOfDay must use 24-hour HH:MM format.')
		if frequency in (ScheduleFrequency.DAILY.value, ScheduleFrequency.WEEKLY.value, ScheduleFrequency.MONTHLY.value):
			if schedule.timeOfDay is None:
				raise TaskValidationException(f'{frequency} schedule requires timeOfDay.')
		if frequency == ScheduleFrequency.WEEKLY.value and schedule.weekday is None:
			raise TaskValidationException('WEEKLY schedule requires weekday (1-7).')
		if frequency == ScheduleFrequency.MONTHLY.value and schedule.dayOfMonth is None:
			raise TaskValidationException('MONTHLY schedule requires dayOfMonth (1-31).')
		if frequency == ScheduleFrequency.INTERVAL.value and (
				schedule.intervalMinutes is None or schedule.intervalMinutes < 1):
			raise TaskValidationException('INTERVAL schedule requires a positive intervalMinutes.')
		if frequency == ScheduleFrequency.CRON.value:
			if schedule.cronExpression is None or len(schedule.cronExpression.split()) != 5:
				raise TaskValidationException('CRON schedule requires a five-field cronExpression.')
		if schedule.graceMinutes < 0 or schedule.dependencyWaitTimeoutMinutes < 1:
			raise TaskValidationException('Schedule grace and dependency wait values are invalid.')
		if schedule.freshnessSlaMinutes is not None and schedule.freshnessSlaMinutes < 1:
			raise TaskValidationException('freshnessSlaMinutes must be positive.')
		if value_of(schedule.mode) == ScheduleMode.MANAGED.value and frequency in (
				ScheduleFrequency.EVENT.value, ScheduleFrequency.STREAMING.value):
			raise TaskValidationException('EVENT and STREAMING schedules cannot be managed by a timer.')

	def validate_task(self, task: TaskDefinition) -> None:
		self.validate(task.schedule)

	def build_instance_key(
			self, request: RunRequest, task: TaskDefinition, scheduled_fire_time: Optional[datetime] = None
	) -> tuple[str, date]:
		if scheduled_fire_time is not None:
			if scheduled_fire_time.tzinfo is None or scheduled_fire_time.utcoffset() is None:
				raise TaskValidationException('scheduledFireTime must include a timezone.')
			if task.schedule is None:
				raise TaskValidationException('A scheduled trigger requires a task schedule.')
			local_time = scheduled_fire_time.astimezone(ZoneInfo(task.schedule.timezone))
			return f'schedule:{scheduled_fire_time.isoformat()}', local_time.date()
		if request.occurrence is not None and (request.windowStart is not None or request.windowEnd is not None):
			raise TaskValidationException('occurrence and window are mutually exclusive.')
		for name, value in (
				('occurrence', request.occurrence), ('windowStart', request.windowStart), ('windowEnd', request.windowEnd)):
			if value is not None and (value.tzinfo is None or value.utcoffset() is None):
				raise TaskValidationException(f'{name} must include a timezone.')
		if (request.windowStart is None) != (request.windowEnd is None):
			raise TaskValidationException('windowStart and windowEnd must be provided together.')
		if request.windowStart is not None and request.windowEnd <= request.windowStart:
			raise TaskValidationException('windowEnd must be later than windowStart.')
		if request.processDate is None:
			raise TaskValidationException('processDate is required for task instance alignment.')
		if request.occurrence is not None:
			return f'occurrence:{request.occurrence.isoformat()}', request.processDate
		if request.windowStart is not None:
			return f'window:{request.windowStart.isoformat()}/{request.windowEnd.isoformat()}', request.processDate
		return f'day:{request.processDate.isoformat()}', request.processDate

	def request_hash(self, request: RunRequest) -> str:
		data = request.model_dump(mode='json', exclude={'idempotencyKey'})
		canonical = json.dumps(data, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
		return hashlib.sha256(canonical.encode('utf-8')).hexdigest()
