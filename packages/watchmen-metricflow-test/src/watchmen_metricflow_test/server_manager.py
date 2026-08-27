"""Starts/stops the metricflow server (uvicorn) as a subprocess."""

import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

import requests

from watchmen_metricflow_test.settings import MetricFlowTestSettings


class MetricFlowServerManager:

	def __init__(self, settings: MetricFlowTestSettings, log_dir: Path):
		self.settings = settings
		self.log_dir = log_dir
		self.process: Optional[subprocess.Popen] = None

	def start(self, attempts: int = 3) -> None:
		"""Start with limited retries: the first attempts can race the database
		container's entrypoint tail (transient 'server closed the connection')."""
		last_error: Optional[Exception] = None
		for attempt in range(1, attempts + 1):
			try:
				self._start_once()
				return
			except RuntimeError as e:
				self.stop()
				last_error = e
				print(f'[mft] server start attempt {attempt} failed: {e}', file=sys.stderr)
				time.sleep(5)
		raise RuntimeError(f'server failed to start after {attempts} attempts') from last_error

	def _start_once(self) -> None:
		if self.process is not None:
			raise RuntimeError('metricflow server already started')
		self._assert_port_free()
		self.log_dir.mkdir(parents=True, exist_ok=True)

		env = dict(os.environ)
		env.update(self.settings.server_env())

		log_file = open(self.log_dir / 'metricflow-server.log', 'ab')
		try:
			self.process = subprocess.Popen(
				[
					sys.executable, '-m', 'uvicorn',
					'watchmen_metricflow.main:app',
					'--host', self.settings.server_host,
					'--port', str(self.settings.server_port),
				],
				cwd=str(self.settings.metricflow_dir),
				stdout=log_file,
				stderr=subprocess.STDOUT,
				env=env,
			)
		finally:
			log_file.close()
		self._wait_until_healthy()

	def stop(self) -> None:
		if self.process is None:
			return
		process, self.process = self.process, None
		process.terminate()
		try:
			process.wait(timeout=15)
		except subprocess.TimeoutExpired:
			process.kill()
			process.wait(timeout=10)

	def tail_log(self, lines: int = 30) -> str:
		log = self.log_dir / 'metricflow-server.log'
		if not log.exists():
			return '(no server log written)'
		content = log.read_text(encoding='utf-8', errors='replace').splitlines()
		return '\n'.join(content[-lines:])

	def _assert_port_free(self) -> None:
		with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
			sock.settimeout(1)
			if sock.connect_ex((self.settings.server_host, self.settings.server_port)) == 0:
				raise RuntimeError(
					f'port {self.settings.server_port} is already in use; '
					f'run with MFT_SERVER_PORT=<free port>'
				)

	def _wait_until_healthy(self) -> None:
		url = f'{self.settings.base_url}/metricflow/health'
		deadline = time.monotonic() + self.settings.server_health_timeout_seconds
		while time.monotonic() < deadline:
			if self.process.poll() is not None:
				raise RuntimeError(
					f'metricflow exited early (code {self.process.returncode}). Last log lines:\n'
					f'{self.tail_log()}'
				)
			try:
				response = requests.get(url, timeout=3)
				if response.status_code == 200:
					return
			except requests.RequestException:
				pass
			time.sleep(2)
		raise RuntimeError(
			f'metricflow not healthy within {self.settings.server_health_timeout_seconds}s.\n'
			f'Last log lines:\n{self.tail_log()}'
		)
