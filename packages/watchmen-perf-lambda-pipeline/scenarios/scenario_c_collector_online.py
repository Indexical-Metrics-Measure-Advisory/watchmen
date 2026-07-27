"""Scenario C: Collector online (synchronous) pipeline trigger.

Path: Lambda Function URL `/collector/trigger/online`
-> OnlineWorker.trigger_online (find root data, build JSON, trigger pipeline).
Synchronous end-to-end within the HTTP request.

The trigger_online endpoint looks up data in the physical table by primary key,
so the record must reference an existing row. We cycle through pre-seeded IDs
(perf_table has rows with ids 'online-1' through 'online-100' plus two
'test-online-*' rows).
"""
from __future__ import annotations

import random

from locust import task

try:
	from .base import PerfBase, render_template
except ImportError:
	from base import PerfBase, render_template

# Pre-seeded IDs in perf_table (inserted by the test setup script).
EXISTING_IDS = [f'online-{i}' for i in range(1, 101)]


class CollectorOnlineUser(PerfBase):
	abstract = False
	weight = 1

	@task
	def trigger_online(self) -> None:
		# Override the random ID with one that exists in perf_table,
		# so find_data_by_data_id can actually find the row.
		existing_id = random.choice(EXISTING_IDS)
		body = render_template('trigger_online.json', ID=existing_id)
		self._post_function_url('/collector/trigger/online', body)
