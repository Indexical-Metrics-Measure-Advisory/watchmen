import unittest
from pathlib import Path

from watchmen_storage_rds.table_defs import find_table


class DdlTest(unittest.TestCase):
	def setUp(self):
		self.root = Path(__file__).parents[4]
		self.tables = (
			'task_definitions', 'task_refs', 'task_dependencies', 'task_runs', 'task_run_dependencies',
			'task_alert_rules', 'task_alert_events', 'task_sync_states', 'task_job_locks')

	def test_storage_version_contains_task_hub_migrations(self):
		for dialect in ('mysql', 'postgresql', 'oracle', 'mssql'):
			ddl_dir = self.root / 'packages' / f'watchmen-storage-{dialect}' / 'meta-scripts' / '18.2.1'
			paths = sorted(ddl_dir.glob('*.sql'))
			self.assertEqual(10, len(paths), dialect)
			content = '\n'.join(path.read_text() for path in paths)
			for table in self.tables:
				self.assertIn(f'CREATE TABLE {table}', content, dialect)
			for constraint in ('uk_run_attempt', 'uk_run_idempotency', 'uk_run_engine', 'uk_alert_event_key', 'uk_task_job_lock'):
				self.assertIn(constraint, content, dialect)
			migration = (ddl_dir / '00010-task_integration.ddl.sql').read_text()
			self.assertIn('external_trigger', migration, dialect)
			self.assertIn('callback', migration, dialect)

	def test_quick_start_mirrors_mysql_and_postgresql(self):
		for dialect in ('mysql', 'postgresql'):
			storage = self.root / 'packages' / f'watchmen-storage-{dialect}' / 'meta-scripts' / '18.2.1'
			quick_start = self.root / 'packages' / 'watchmen-quick-start' / 'docker' / dialect / 'init-scripts' / 'meta-scripts' / '18.2.1'
			for source in storage.glob('*.sql'):
				self.assertEqual(source.read_bytes(), (quick_start / source.name).read_bytes())

	def test_rds_registers_all_task_hub_tables(self):
		for table in self.tables:
			self.assertEqual(table, find_table(table).name)


if __name__ == '__main__':
	unittest.main()
