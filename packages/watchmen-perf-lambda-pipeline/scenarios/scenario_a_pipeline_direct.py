"""Scenario A: HTTP direct pipeline trigger.

Path: Lambda Function URL `/pipeline/data` -> `try_to_invoke_pipelines` (sync).
The simplest path; measures pipeline-engine throughput baseline without the
collector four-stage pipeline.
"""
from __future__ import annotations

from locust import task

try:
	from .base import PerfBase, render_template
except ImportError:
	from base import PerfBase, render_template


class PipelineDirectUser(PerfBase):
	abstract = False
	weight = 1

	@task
	def trigger_pipeline(self) -> None:
		body = render_template('pipeline_data.json')
		self._post_function_url('/pipeline/data', body)
