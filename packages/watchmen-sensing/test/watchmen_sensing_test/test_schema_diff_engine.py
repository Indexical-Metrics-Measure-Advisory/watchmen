from unittest import TestCase

from watchmen_sensing.engine.schema_diff_engine import diff_tables, fingerprint
from watchmen_sensing.model.schema_diff import TableDiff
from watchmen_sensing.model.schema_snapshot import ColumnDescriptor, TableSchema


def col(name, data_type=None, nullable=None):
	return ColumnDescriptor(name=name, dataType=data_type, nullable=nullable)


def table(name, columns=None):
	return TableSchema(tableName=name, columns=columns or [])


class FingerprintTestCase(TestCase):
	def test_none_returns_none(self):
		self.assertIsNone(fingerprint(None))

	def test_empty_is_stable(self):
		self.assertEqual(fingerprint([]), fingerprint([]))

	def test_identical_content_same_fingerprint(self):
		a = [table('policy', [col('id', 'VARCHAR(64)'), col('amount', 'INT', True)])]
		b = [table('policy', [col('id', 'VARCHAR(64)'), col('amount', 'INT', True)])]
		self.assertEqual(fingerprint(a), fingerprint(b))

	def test_order_independent(self):
		a = [table('a', [col('x'), col('y')]), table('b', [col('z')])]
		b = [table('b', [col('z')]), table('a', [col('y'), col('x')])]
		self.assertEqual(fingerprint(a), fingerprint(b))

	def test_different_content_different_fingerprint(self):
		a = [table('policy', [col('id', 'VARCHAR(64)')])]
		b = [table('policy', [col('id', 'VARCHAR(128)')])]
		self.assertNotEqual(fingerprint(a), fingerprint(b))


class DiffTablesTestCase(TestCase):
	def test_identical_schemas_no_diff(self):
		before = [table('policy', [col('id'), col('amount')])]
		after = [table('policy', [col('id'), col('amount')])]
		self.assertEqual(diff_tables(before, after), [])

	def test_none_inputs_treated_as_empty(self):
		self.assertEqual(diff_tables(None, None), [])

	def test_table_added(self):
		before = [table('policy', [col('id')])]
		after = [table('policy', [col('id')]), table('claim', [col('id')])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		self.assertEqual(diffs[0].tableName, 'claim')
		self.assertEqual(diffs[0].changeType, 'TABLE_ADDED')

	def test_table_removed(self):
		before = [table('policy', [col('id')]), table('claim', [col('id')])]
		after = [table('policy', [col('id')])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		self.assertEqual(diffs[0].tableName, 'claim')
		self.assertEqual(diffs[0].changeType, 'TABLE_REMOVED')

	def test_column_added(self):
		before = [table('policy', [col('id'), col('amount')])]
		after = [table('policy', [col('id'), col('amount'), col('currency')])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		self.assertEqual(diffs[0].changeType, 'COLUMNS_CHANGED')
		cc = diffs[0].columnChanges
		self.assertEqual(len(cc), 1)
		self.assertEqual(cc[0].column, 'currency')
		self.assertEqual(cc[0].changeType, 'COLUMN_ADDED')
		self.assertIsNone(cc[0].before)
		self.assertIsNotNone(cc[0].after)

	def test_column_removed(self):
		before = [table('policy', [col('id'), col('amount'), col('legacy')])]
		after = [table('policy', [col('id'), col('amount')])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		cc = diffs[0].columnChanges
		self.assertEqual(len(cc), 1)
		self.assertEqual(cc[0].column, 'legacy')
		self.assertEqual(cc[0].changeType, 'COLUMN_REMOVED')
		self.assertIsNone(cc[0].after)

	def test_type_changed(self):
		before = [table('policy', [col('amount', 'INT')])]
		after = [table('policy', [col('amount', 'DECIMAL(18,2)')])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		cc = diffs[0].columnChanges
		self.assertEqual(cc[0].changeType, 'TYPE_CHANGED')
		self.assertEqual(cc[0].before.get('dataType'), 'INT')
		self.assertEqual(cc[0].after.get('dataType'), 'DECIMAL(18,2)')

	def test_nullable_changed(self):
		# Same type, only nullable differs -> NULLABLE_CHANGED (not TYPE_CHANGED).
		before = [table('policy', [col('amount', 'INT', False)])]
		after = [table('policy', [col('amount', 'INT', True)])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		cc = diffs[0].columnChanges
		self.assertEqual(cc[0].changeType, 'NULLABLE_CHANGED')
		self.assertEqual(cc[0].before.get('nullable'), False)
		self.assertEqual(cc[0].after.get('nullable'), True)

	def test_type_change_takes_precedence_over_nullable(self):
		# When both type and nullable differ, TYPE_CHANGED is reported (it's checked first).
		before = [table('policy', [col('amount', 'INT', False)])]
		after = [table('policy', [col('amount', 'DECIMAL(18,2)', True)])]
		diffs = diff_tables(before, after)
		self.assertEqual(diffs[0].columnChanges[0].changeType, 'TYPE_CHANGED')

	def test_multiple_column_changes_one_table(self):
		before = [table('policy', [col('id', 'VARCHAR(64)'), col('amount', 'INT'), col('legacy', 'TEXT')])]
		after = [table('policy', [col('id', 'VARCHAR(128)'), col('amount', 'INT'), col('currency', 'CHAR(3)')])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		types = sorted(cc.changeType for cc in diffs[0].columnChanges)
		self.assertEqual(types, ['COLUMN_ADDED', 'COLUMN_REMOVED', 'TYPE_CHANGED'])

	def test_mixed_table_and_column_changes(self):
		before = [table('policy', [col('id')])]
		after = [table('policy', [col('id'), col('name')]), table('claim', [col('id')])]
		diffs = diff_tables(before, after)
		# one TABLE_ADDED (claim) + one COLUMNS_CHANGED (policy)
		self.assertEqual(len(diffs), 2)
		change_types = sorted(d.changeType for d in diffs)
		self.assertEqual(change_types, ['COLUMNS_CHANGED', 'TABLE_ADDED'])


class TableDiffModelTestCase(TestCase):
	def test_table_diff_defaults(self):
		d = TableDiff(tableName='x', changeType='TABLE_ADDED')
		self.assertEqual(d.columnChanges, [])


class DefaultCommentDiffTestCase(TestCase):
	def test_default_changed(self):
		before = [table('policy', [ColumnDescriptor(name='amount', dataType='INT', nullable=True, defaultValue='0')])]
		after = [table('policy', [ColumnDescriptor(name='amount', dataType='INT', nullable=True, defaultValue='1')])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		self.assertEqual(diffs[0].columnChanges[0].changeType, 'DEFAULT_CHANGED')

	def test_comment_changed(self):
		before = [table('policy', [ColumnDescriptor(name='amount', dataType='INT', comment='old')])]
		after = [table('policy', [ColumnDescriptor(name='amount', dataType='INT', comment='new')])]
		diffs = diff_tables(before, after)
		self.assertEqual(len(diffs), 1)
		self.assertEqual(diffs[0].columnChanges[0].changeType, 'COMMENT_CHANGED')

	def test_default_change_alters_fingerprint(self):
		a = [table('policy', [ColumnDescriptor(name='id', dataType='INT', defaultValue='0')])]
		b = [table('policy', [ColumnDescriptor(name='id', dataType='INT', defaultValue='1')])]
		self.assertNotEqual(fingerprint(a), fingerprint(b))

	def test_comment_change_alters_fingerprint(self):
		a = [table('policy', [ColumnDescriptor(name='id', dataType='INT', comment='a')])]
		b = [table('policy', [ColumnDescriptor(name='id', dataType='INT', comment='b')])]
		self.assertNotEqual(fingerprint(a), fingerprint(b))
