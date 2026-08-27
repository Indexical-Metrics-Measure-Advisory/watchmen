"""Starts/stops the doll server (uvicorn) as a subprocess with CI-parity env.

The server runs on the host (not containerized) so failures surface as normal
Python tracebacks and breakpoints work against a real full-stack run.
"""

import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

import requests

from watchmen_test_harness.settings import HarnessSettings


class DollServerManager:

	def __init__(self, settings: HarnessSettings, log_dir: Path):
		self.settings = settings
		self.log_dir = log_dir
		self.process: Optional[subprocess.Popen] = None

	def start(self) -> None:
		if self.process is not None:
			raise RuntimeError('doll server already started')
		self._assert_port_free()
		self.log_dir.mkdir(parents=True, exist_ok=True)
		# LOGGER_TO_FILE writes rotating.log under <doll>/temp; CI does `mkdir -p temp`
		(self.settings.doll_dir / 'temp').mkdir(parents=True, exist_ok=True)

		env = dict(os.environ)
		env.update(self.settings.server_env())

		log_file = open(self.log_dir / 'doll-server.log', 'ab')
		try:
			self.process = subprocess.Popen(
				[
					sys.executable, '-m', 'uvicorn',
					'watchmen_rest_doll.main:app',
					'--host', self.settings.server_host,
					'--port', str(self.settings.server_port),
				],
				cwd=str(self.settings.doll_dir),
				stdout=log_file,
				stderr=subprocess.STDOUT,
				env=env,
			)
		finally:
			# Popen duplicates the fds; close our copies immediately
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
		log = self.log_dir / 'doll-server.log'
		if not log.exists():
			return '(no server log written)'
		content = log.read_text(encoding='utf-8', errors='replace').splitlines()
		return '\n'.join(content[-lines:])

	# ------------------------------------------------------------------ internals

	def _assert_port_free(self) -> None:
		with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
			sock.settimeout(1)
			if sock.connect_ex((self.settings.server_host, self.settings.server_port)) == 0:
				raise RuntimeError(
					f'port {self.settings.server_port} is already in use; '
					f'stop that process or run with WHT_SERVER_PORT=<free port>'
				)

	def _wait_until_healthy(self) -> None:
		url = f'{self.settings.base_url}/health'
		deadline = time.monotonic() + self.settings.server_health_timeout_seconds
		while time.monotonic() < deadline:
			if self.process.poll() is not None:
				raise RuntimeError(
					f'doll exited early (code {self.process.returncode}). Last log lines:\n'
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
			f'doll not healthy within {self.settings.server_health_timeout_seconds}s.\n'
			f'Last log lines:\n{self.tail_log()}'
		)
