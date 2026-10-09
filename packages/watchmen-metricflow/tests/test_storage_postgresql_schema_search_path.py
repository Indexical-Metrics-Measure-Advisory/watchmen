"""search_path alignment for the PostgreSQL storage helper.

A datasource can declare a target schema (param name `schema`); schema-qualified
read paths resolve into it, while unqualified DDL emitted by topic storage
(CREATE/TRUNCATE/DROP) previously fell back to the connection default. The
helper must set the connection search_path so both land in the same schema.
"""
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))

import _metric_test_base  # noqa: F401  sys.path bootstrap for sibling packages

from watchmen_model.system import DataSource, DataSourceParam, DataSourceType
from watchmen_storage_postgresql.data_source_postgresql import PostgreSQLDataSourceHelper
from watchmen_storage_postgresql.storage_postgresql import TopicDataStoragePostgreSQL


def make_data_source(schema=None):
	params = [DataSourceParam(name='schema', value=schema)] if schema else []
	return DataSource(
		dataSourceId='ds-1', dataSourceType=DataSourceType.POSTGRESQL,
		host='127.0.0.1', port='5432', username='user', password='pwd',
		name='postgres', params=params)


def make_engine(dialect_name='postgresql'):
	return SimpleNamespace(dialect=SimpleNamespace(name=dialect_name))


class TestApplySchemaSearchPath(unittest.TestCase):
	def _apply(self, data_source, dialect='postgresql'):
		engine = make_engine(dialect)
		with mock.patch('watchmen_storage_postgresql.data_source_postgresql.event.listen') as listen:
			PostgreSQLDataSourceHelper.apply_schema_search_path(engine, data_source)
		return listen

	@staticmethod
	def _invoke(callback):
		cursor = mock.MagicMock()
		connection = mock.MagicMock()
		connection.cursor.return_value = cursor
		callback(connection, mock.MagicMock())
		return cursor, connection

	def test_listens_and_sets_search_path_when_schema_param_present(self):
		listen = self._apply(make_data_source('life_metrics'))
		listen.assert_called_once()
		engine, event_name, callback = listen.call_args.args
		self.assertIs(engine, listen.call_args.args[0])
		self.assertEqual('connect', event_name)
		cursor, connection = self._invoke(callback)
		cursor.execute.assert_called_once_with('SET search_path TO "life_metrics", public')
		cursor.close.assert_called_once()
		connection.commit.assert_called_once()

	def test_no_schema_param_skips(self):
		listen = self._apply(make_data_source(None))
		listen.assert_not_called()

	def test_blank_schema_value_skips(self):
		listen = self._apply(make_data_source('   '))
		listen.assert_not_called()

	def test_non_postgresql_dialect_skips(self):
		listen = self._apply(make_data_source('life_metrics'), dialect='snowflake')
		listen.assert_not_called()

	def test_schema_quotes_are_escaped(self):
		listen = self._apply(make_data_source('odd"name'))
		callback = listen.call_args.args[2]
		cursor, _ = self._invoke(callback)
		cursor.execute.assert_called_once_with('SET search_path TO "odd""name", public')


class TestAskReflectSqlSchemaCondition(unittest.TestCase):
	def setUp(self):
		self.storage = TopicDataStoragePostgreSQL(None)

	def test_explicit_schema_filter(self):
		sql = self.storage.ask_reflect_sql('topic_x', 'life_metrics')
		self.assertIn("pg_catalog.pg_namespace.nspname = 'life_metrics'", sql)

	def test_blank_schema_falls_back_to_current_schema(self):
		for schema in (None, ''):
			sql = self.storage.ask_reflect_sql('topic_x', schema)
			self.assertIn(
				'pg_catalog.pg_namespace.nspname = pg_catalog.current_schema()', sql)


if __name__ == '__main__':
	unittest.main()
