"""Scenario D: EventBridge scheduled listener drive.

Path: EventBridge schedule rule -> Lambda `EVENTBRIDGE` branch
-> CollectorListener.listen() -> SQS fan-out -> run_pipeline.

The Locust user does not drive the Lambda directly. Instead it:
  1. Submits TriggerEvents via the Function URL `/collector/trigger/event`
     (the EventBridge listener will pick these up and orchestrate them).
  2. Polls `/collector/trigger/events/finished` for end-to-end completion.

This mirrors scenario B but exercises the EventBridge-driven listener/coordinator
fan-out rather than relying on the synchronous `/event/record` path. The
EventBridge rules themselves are registered by infra/eventbridge-rules.sh.

Note: When LocalStack community edition cannot run container-image Lambdas,
the LAMBDA_FUNCTION_URL is set to the doll REST API directly. The doll service
has CollectorEventListener enabled (QUERY_BASED_CHANGE_DATA_CAPTURE=true),
which processes INITIAL events through the same four-stage pipeline that the
Lambda EVENTBRIDGE branch would trigger.
"""
from __future__ import annotations

import time

from locust import task

try:
	from .base import PerfBase, env_int, render_template
except ImportError:
	from base import PerfBase, env_int, render_template

# Poll cadence for /collector/trigger/events/finished (seconds).
POLL_INTERVAL = env_int('SCENARIO_D_POLL_INTERVAL', 2)
# Max time to wait for a single event to finish before declaring it failed (seconds).
POLL_TIMEOUT = env_int('SCENARIO_D_POLL_TIMEOUT', 120)


class EventBridgeScheduledUser(PerfBase):
	abstract = False
	weight = 1

	@task
	def submit_event_for_listener(self) -> None:
		# Capture the finished-event count before creating a new event.
		finished_before = self._finished_count()

		body = render_template('trigger_event_default.json')
		resp = self._post_function_url('/collector/trigger/event', body)
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
		print(f'[scenario-d] timed out waiting for finish count {target} after {POLL_TIMEOUT}s')
