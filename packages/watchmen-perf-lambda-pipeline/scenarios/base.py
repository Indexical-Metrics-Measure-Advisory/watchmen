"""Shared Locust base for the Lambda -> pipeline perf scenarios.

Loads env vars produced by infra/seed-watchmen.sh (.env.d/watchmen.env), renders
payload templates, provides PAT-authenticated request helpers, and a warmup hook
to isolate Lambda cold starts.

Pure helpers (env, render_template, ...) live in
watchmen_perf_lambda_pipeline.payload_renderer so they can be unit-tested without
locust installed; this module re-exports them for convenience.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from locust import HttpUser, constant_pacing

# Make the src/ package importable when running `locust -f scenarios/...`
# from the package root without installing the package.
_PKG_ROOT = Path(__file__).resolve().parent.parent
_SRC = _PKG_ROOT / 'src'
if str(_SRC) not in sys.path:
	sys.path.insert(0, str(_SRC))

from watchmen_perf_lambda_pipeline.payload_renderer import (  # noqa: E402
	env, env_int, load_env_files, render_template,
)

__all__ = ['env', 'env_int', 'load_env_files', 'render_template', 'PerfBase']


class PerfBase(HttpUser):
	"""Base HttpUser that authenticates with the PAT and targets the Lambda Function URL.

	Subclasses set `abstract = False` and implement `@task` methods.
	"""

	abstract = True
	wait_time = constant_pacing(1)  # 1 request per second per user
	host = env('LAMBDA_FUNCTION_URL', 'http://localhost:4566')

	def on_start(self) -> None:
		load_env_files()
		# Re-read host after env load (Locust reads `host` at class-def time)
		self.host = env('LAMBDA_FUNCTION_URL', self.host)
		self.pat = env('PERF_PAT', '')
		self.tenant_id = env('PERF_TENANT_ID', '')
		self.topic_code = env('PERF_TOPIC_CODE', 'perf_raw_topic')
		if not self.pat:
			raise RuntimeError(
				'PERF_PAT is empty; run infra/seed-watchmen.sh first '
				'(or source .env.d/watchmen.env).'
			)
		if env_int('WARMUP', 1) == 1:
			self._warmup()

	def _warmup(self) -> None:
		"""Fire one trivial request to initialise the Lambda execution context."""
		body = render_template('pipeline_data.json')
		try:
			self._post_function_url('/pipeline/data', body, expect_response=False)
		except Exception:  # noqa: BLE001
			# Warmup failures are non-fatal; the first real request will surface real errors.
			pass

	def _post_function_url(self, raw_path: str, body: dict,
	                        expect_response: bool = True) -> dict:
		"""POST to the Lambda Function URL.

		The Function URL event shape requires `rawPath` and an Authorization header
		(see packages/watchmen-serverless-lambda/src/watchmen_serverless_lambda/trigger/rest.py).
		"""
		with self.client.post(
			raw_path,
			json=body,
			headers={'Authorization': f'pat {self.pat}'},
			name=f'POST {raw_path}',
			catch_response=True,
		) as resp:
			if resp.status_code != 200:
				resp.failure(f'status={resp.status_code} body={resp.text[:200]}')
				return {}
			if expect_response:
				try:
					return resp.json().get('body', resp.json())
				except Exception:  # noqa: BLE001
					resp.failure(f'non-json body: {resp.text[:200]}')
					return {}
			resp.success()
			return {}

	def _doll_get(self, path: str) -> dict:
		"""GET against the doll (not the Lambda Function URL). Used for polling."""
		doll_base = env('DOLL_BASE_URL', 'http://watchmen_doll:8000')
		import urllib.request
		import urllib.error
		req = urllib.request.Request(
			f'{doll_base}{path}',
			headers={'Authorization': f'pat {self.pat}', 'Accept': 'application/json'},
		)
		try:
			with urllib.request.urlopen(req, timeout=30) as r:
				return json.loads(r.read().decode())
		except urllib.error.HTTPError as e:
			return {'error': e.code, 'detail': e.read().decode()[:200]}
