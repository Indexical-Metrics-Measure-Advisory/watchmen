"""Applies watchmen-storage-mysql meta/data scripts in the same order as CI.

Mirrors `.github/workflows/test-build-mysql.yml`:
  - version directories sorted with `ls -v` semantics (natural version order)
  - files inside a version directory in plain lexicographic order (shell glob)
Statements are executed with PyMySQL MULTI_STATEMENTS, which behaves like piping a
file into the mysql client for straight-line DDL/DML (no DELIMITER blocks — those do
not appear anywhere in these scripts; asserted explicitly below).
"""

import re
from pathlib import Path
from typing import List

import pymysql
from pymysql.constants import CLIENT

from watchmen_test_harness.settings import HarnessSettings

_VERSION_PART = re.compile(r'(\d+|\D+)')


def _version_key(name: str) -> list:
	# natural sort: split digit/non-digit runs, digits compare numerically (`ls -v`)
	return [int(part) if part.isdigit() else part for part in _VERSION_PART.split(name) if part != '']


class DbBootstrapper:

	def __init__(self, settings: HarnessSettings):
		self.settings = settings

	def wait_until_ready(self, timeout_seconds: int = 120) -> None:
		import time

		deadline = time.monotonic() + timeout_seconds
		last_error: Exception = RuntimeError('mysql was not probed')
		while time.monotonic() < deadline:
			try:
				# probe as root: the compose service always seeds the root password
				with self._connect(user='root', password=self.settings.mysql_root_password) as conn:
					with conn.cursor() as cursor:
						cursor.execute('SELECT 1')
						return
			except pymysql.err.OperationalError as e:
				last_error = e
				time.sleep(2)
		raise RuntimeError(f'mysql not ready within {timeout_seconds}s: {last_error}') from last_error

	def apply_session_flags(self) -> None:
		"""CI sets log_bin_trust_function_creators=1 as root before running scripts."""
		if self.settings.mysql_root_password is None:
			return
		with self._connect(user='root', password=self.settings.mysql_root_password) as conn:
			with conn.cursor() as cursor:
				cursor.execute('SET GLOBAL log_bin_trust_function_creators = 1')

	def apply_scripts(self) -> List[str]:
		executed: List[str] = []
		for base in (self.settings.mysql_meta_scripts(), self.settings.mysql_data_scripts()):
			for version_dir in self._list_versions(base):
				for script in sorted(version_dir.glob('*')):
					if not script.is_file():
						continue
					self._apply_file(script)
					executed.append(str(script.relative_to(base.parent.parent)))
		return executed

	# ------------------------------------------------------------------ internals

	def _connect(self, user: str, password: str) -> pymysql.connections.Connection:
		return pymysql.connect(
			host=self.settings.mysql_host,
			port=self.settings.mysql_port,
			user=user,
			password=password,
			database=self.settings.mysql_database,
			charset='utf8mb4',
			client_flag=CLIENT.MULTI_STATEMENTS,
			connect_timeout=5,
		)

	def _list_versions(self, base: Path) -> List[Path]:
		if not base.exists():
			raise FileNotFoundError(f'scripts directory missing: {base}')
		version_dirs = [d for d in base.iterdir() if d.is_dir()]
		return sorted(version_dirs, key=lambda d: _version_key(d.name))

	def _apply_file(self, script: Path) -> None:
		sql = script.read_text(encoding='utf-8', errors='replace')
		# stored routines (data-scripts/*.func.sql) use DELIMITER directives like the
		# mysql client; everything else runs as one multi-statement batch, like CI piping
		# the whole file into `mysql <`
		statements = self._split_delimiter_blocks(sql) if re.search(r'(?i)\bDELIMITER\b', sql) else [sql]
		try:
			conn = self._connect(user=self.settings.mysql_user, password=self.settings.mysql_password)
			try:
				with conn.cursor() as cursor:
					for statement in statements:
						cursor.execute(statement)
						# drain every statement's result set, otherwise MULTI_STATEMENTS errors on close
						while cursor.nextset():
							pass
				conn.commit()
			finally:
				conn.close()
		except Exception as e:
			raise RuntimeError(f'failed applying {script}: {e}') from e

	@staticmethod
	def _split_delimiter_blocks(sql: str) -> List[str]:
		"""Split a DELIMITER-using script into single statements.

		Mirrors how the mysql client reads such files: a line `DELIMITER xx` switches
		the terminator; statements end at an occurrence of that terminator. Body text
		before the first directive uses the default `;`.
		"""
		statements: List[str] = []
		delimiter = ';'
		buffer = ''

		def flush_up_to(index: int) -> None:
			statement = buffer[:index]
			if statement.strip():
				statements.append(statement)

		for raw_line in sql.splitlines():
			directive = re.match(r'(?i)^\s*DELIMITER\s+(\S+)\s*$', raw_line)
			if directive:
				# close whatever pending statement is open under the old delimiter
				while delimiter in buffer:
					idx = buffer.find(delimiter)
					flush_up_to(idx)
					buffer = buffer[idx + len(delimiter):]
				buffer = ''
				delimiter = directive.group(1)
				continue
			buffer += raw_line + '\n'
			while delimiter in buffer:
				idx = buffer.find(delimiter)
				flush_up_to(idx)
				buffer = buffer[idx + len(delimiter):]
		if buffer.strip():
			statements.append(buffer)
		return statements
