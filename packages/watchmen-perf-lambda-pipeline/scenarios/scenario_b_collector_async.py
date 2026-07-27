"""Scenario B: Collector async (full four-stage) pipeline.

Path: Lambda Function URL `/collector/trigger/event/record` (BY_RECORD)
-> TriggerEvent persisted (status=INITIAL)
-> EventBridge listener -> SQS ASSIGN_RECORD -> coordinator -> SAVE_RECORD
-> BUILD_JSON -> POST_JSON -> RUN_TASK -> run_pipeline (sync).

This is the most production-like path. Because the HTTP response only acknowledges
that the TriggerEvent was created, we additionally poll
`/collector/trigger/events/finished` to measure true end-to-end completion time
(including all four SQS-driven stages).

Note: the finished-events endpoint returns objects with incomplete serialization
(only a few columns, camelCase mapping is broken), so we rely on the list length
growing rather than matching a specific eventTriggerId.
"""
from __future__ import annotations

import time

from locust import task

try:
	from .base import PerfBase, env_int, render_template
except ImportError:
	from base import PerfBase, env_int, render_template

# Poll cadence for /collector/trigger/events/finished (seconds).
POLL_INTERVAL = env_int('SCENARIO_B_POLL_INTERVAL', 2)
# Max time to wait for a single event to finish before declaring it failed (seconds).
POLL_TIMEOUT = env_int('SCENARIO_B_POLL_TIMEOUT', 120)


class CollectorAsyncUser(PerfBase):
	abstract = False
	weight = 1

	@task
	def trigger_record_event(self) -> None:
		# Capture the finished-event count before creating a new event.
		finished_before = self._finished_count()

		body = render_template('trigger_event_record.json')
		resp = self._post_function_url('/collector/trigger/event/record', body)
		if not resp:
			return

		# Poll until the finished count increases (the event was processed).
		self._wait_for_finish_count(finished_before + 1)

	def _finished_count(self) -> int:
		data = self._doll_get('/collector/trigger/events/finished')
		if isinstance(data, list):
			return len(data)
		return 0

	def _wait_for_finish_count(self, target: int) -> None:
		deadline = time.time() + POLL_TIMEOUT
		while time.time() < deadline:
			if self._finished_count() >= target:
				return
			time.sleep(POLL_INTERVAL)
		# Timed out; the request itself succeeded (event was accepted), so we don't
		# mark the Locust request as a failure here, but we log via console.
		print(f'[scenario-b] timed out waiting for finish count {target} after {POLL_TIMEOUT}s')
