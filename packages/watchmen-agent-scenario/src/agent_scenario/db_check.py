from typing import Any, List, Tuple

from agent_scenario.report import Report
from agent_scenario.settings import Settings


def query(settings: Settings, sql: str, params: Tuple = ()) -> List[Tuple[Any, ...]]:
	"""Read-only query against the scenario MySQL server (cross-plane evidence)."""
	import pymysql

	connection = pymysql.connect(
		host=settings.mysql_host, port=settings.mysql_port,
		user=settings.mysql_user, password=settings.mysql_password,
		database=settings.mysql_database, charset='utf8mb4')
	try:
		with connection.cursor() as cursor:
			cursor.execute(sql, params)
			return cursor.fetchall()
	finally:
		connection.close()


def db_available(settings: Settings) -> bool:
	return bool(settings.mysql_user)


def scalar(settings: Settings, sql: str, params: Tuple = ()) -> Any:
	rows = query(settings, sql, params)
	return rows[0][0] if rows else None


def check(
		settings: Settings, report: Report, name: str,
		sql: str, expected, params: Tuple = (), compare=None) -> Any:
	"""Assert a single-value SQL result; skip (recorded) when DB creds are absent."""
	if not db_available(settings):
		report.record(name, True, 'skipped: SCN_MYSQL_USER not set')
		return None
	actual = scalar(settings, sql, params)
	ok = compare(actual, expected) if compare else actual == expected
	if not ok:
		report.record(name, False, f'expected {expected}, got {actual} | {sql}')
		raise AssertionError(f'{name}: expected {expected}, got {actual}')
	report.record(name, True, f'{actual}')
	return actual
