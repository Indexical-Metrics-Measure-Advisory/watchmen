from typing import Any, Dict, List

from agent_scenario.http_client import ApiClient, HttpError
from agent_scenario.report import Report, truncate
from agent_scenario.settings import Settings

# Tenant infra topics that must carry a datasource, otherwise pipeline monitor-log
# writes fail on a freshly initialized tenant (same trick as watchmen-test-harness).
INFRA_TOPICS = ['raw_pipeline_monitor_log', 'pipeline_monitor_error_log']


def ensure_database(settings: Settings, report: Report) -> None:
	"""Create the scenario MySQL database when it does not exist yet."""
	import pymysql

	if not settings.mysql_user:
		report.record('bootstrap.database', False, 'SCN_MYSQL_USER is not set')
		return
	connection = pymysql.connect(
		host=settings.mysql_host, port=settings.mysql_port,
		user=settings.mysql_user, password=settings.mysql_password,
		charset='utf8mb4', autocommit=True)
	try:
		with connection.cursor() as cursor:
			cursor.execute(
				f'CREATE DATABASE IF NOT EXISTS `{settings.mysql_database}` '
				'CHARACTER SET utf8mb4 COLLATE utf8mb4_bin')
	finally:
		connection.close()
	report.record('bootstrap.database', True, settings.mysql_database)


def ensure_datasource(settings: Settings, report: Report, super_client: ApiClient) -> Dict[str, Any]:
	"""Create or update the scenario datasource by dataSourceCode (super-admin only)."""
	payload: Dict[str, Any] = {
		'dataSourceCode': settings.datasource_code,
		'dataSourceType': 'mysql',
		'host': settings.mysql_host,
		'port': settings.mysql_port,
		'username': settings.mysql_user,
		'password': settings.mysql_password,
		'name': settings.mysql_database,
	}
	existing = find_datasource_by_code(super_client, settings.datasource_code)
	if existing is not None:
		payload['dataSourceId'] = existing['dataSourceId']
	saved = super_client.post('/datasource', payload)
	# the response clears the password when HIDE_DATASOURCE_PWD is on; keep our copy
	saved['password'] = settings.mysql_password
	report.record(
		'bootstrap.datasource', True,
		f"{settings.datasource_code} -> dataSourceId {saved.get('dataSourceId')}")
	return saved


def find_datasource_by_code(client: ApiClient, code: str) -> Dict[str, Any]:
	for data_source in client.get('/datasource/all'):
		if data_source.get('dataSourceCode') == code:
			return data_source
	return None


def bind_infra_topics(
		settings: Settings, report: Report, admin_client: ApiClient, data_source_id: str) -> None:
	"""Point tenant infra monitor-log topics at the scenario datasource when unbound."""
	bound: List[str] = []
	for topic_name in INFRA_TOPICS:
		found = admin_client.get(
			'/topic/list/name', params={'query_name': topic_name, 'exclude_types': ''})
		if not found:
			continue
		topic = found[0]
		if topic.get('dataSourceId'):
			continue
		topic['dataSourceId'] = data_source_id
		admin_client.post('/topic', topic)
		bound.append(topic_name)
	if bound:
		report.record('bootstrap.infra_topics', True, f'bound: {", ".join(bound)}')
	else:
		report.record('bootstrap.infra_topics', True, 'already bound or absent')


def run_bootstrap(settings: Settings, report: Report, admin_client: ApiClient,
		super_client: ApiClient) -> Dict[str, Any]:
	"""Full bootstrap: database, datasource, infra topic binding."""
	try:
		ensure_database(settings, report)
	except Exception as e:  # noqa: BLE001 - bootstrap failures are reported, not fatal here
		report.record('bootstrap.database', False, truncate(e))
		raise
	try:
		data_source = ensure_datasource(settings, report, super_client)
	except HttpError as e:
		detail = str(e)
		if '403' in detail:
			detail += (' (hint: POST /datasource is super-admin only; '
				'SCN_SUPER_PAT must belong to a super-admin account)')
		report.record('bootstrap.datasource', False, truncate(detail))
		raise
	try:
		bind_infra_topics(settings, report, admin_client, data_source['dataSourceId'])
	except HttpError as e:
		report.record('bootstrap.infra_topics', False, truncate(e))
	return data_source
