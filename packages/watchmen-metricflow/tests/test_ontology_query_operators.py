import sys
import unittest
from pathlib import Path
from typing import List, Optional


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = PACKAGE_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

PACKAGES_ROOT = PACKAGE_ROOT.parent
for package_dir in PACKAGES_ROOT.iterdir():
    src_dir = package_dir / "src"
    if src_dir.exists() and str(src_dir) not in sys.path:
        sys.path.insert(0, str(src_dir))


from sqlalchemy.dialects import mysql, postgresql, sqlite

from watchmen_metricflow.ontology.schema import OntologyQueryRequest
from watchmen_metricflow.ontology.sql_compiler import OntologySqlCompileError, OntologySqlCompiler
from watchmen_model.admin import (
    DerivedAttribute,
    JoinCondition,
    PhysicalTableMapping,
    VirtualLink,
    VirtualObject,
    VirtualObjectAttribute,
    VirtualOntology,
)


# --------------------------------------------------------------------------- #
# Fixtures
# --------------------------------------------------------------------------- #

def _make_ontology() -> VirtualOntology:
    """policy (primary: dm_policy) --holder_link--> holder (primary: dm_holder).

    The policy object also maps dm_holder as a non-primary detail table so that
    order-by on a non-primary attribute can be asserted to trigger a JOIN.
    """
    policy = VirtualObject(
        id='vo-policy', name='policy',
        physicalTables=[
            PhysicalTableMapping(
                topicName='dm_policy', alias='c', kind='primary',
                fields=['id', 'amount', 'holder_id', 'created']),
            PhysicalTableMapping(
                topicName='dm_holder', alias='h', kind='detail',
                fields=['id', 'region'],
                joinConditions=[JoinCondition(sourceField='holder_id', targetField='id')]),
        ],
        attributes=[
            VirtualObjectAttribute(name='id', sourceTable='c', sourceField='id'),
            VirtualObjectAttribute(name='amount', sourceTable='c', sourceField='amount'),
            VirtualObjectAttribute(name='created', sourceTable='c', sourceField='created'),
            VirtualObjectAttribute(name='region', sourceTable='h', sourceField='region'),
        ],
        derivedAttributes=[
            DerivedAttribute(name='holder_cnt', aggregate='count', path=['holder_link']),
        ],
    )
    holder = VirtualObject(
        id='vo-holder', name='holder',
        physicalTables=[
            PhysicalTableMapping(topicName='dm_holder', alias='hh', kind='primary', fields=['id', 'region']),
        ],
        attributes=[
            VirtualObjectAttribute(name='id', sourceTable='hh', sourceField='id'),
        ],
    )
    link = VirtualLink(
        id='holder_link', name='holder_link',
        sourceObjectId='vo-policy', targetObjectId='vo-holder',
        joinConditions=[JoinCondition(sourceField='holder_id', targetField='id')],
    )
    return VirtualOntology(
        ontologyId='o1', name='ins', virtualObjects=[policy, holder], virtualLinks=[link])


def _compile_sql(request: OntologyQueryRequest, dialect_name: Optional[str] = None, render_dialect=None) -> str:
    compiled = OntologySqlCompiler().compile(_make_ontology(), request, dialect_name=dialect_name)
    return str(compiled.statement.compile(dialect=render_dialect or sqlite.dialect()))


def _request(**kwargs) -> OntologyQueryRequest:
    kwargs.setdefault('virtualObjectId', 'vo-policy')
    return OntologyQueryRequest(**kwargs)


# --------------------------------------------------------------------------- #
# Runtime filter operators
# --------------------------------------------------------------------------- #

class TestRequestFilterOperators(unittest.TestCase):
    def test_scalar_filter_is_equality(self):
        sql = _compile_sql(_request(filters={'amount': 10}))
        self.assertIn('WHERE', sql)
        self.assertIn('=', sql)
        self.assertNotIn('>', sql)

    def test_operator_dict_filter_gt(self):
        sql = _compile_sql(_request(filters={'amount': {'operator': 'gt', 'value': 10}}))
        self.assertIn('>', sql)

    def test_operator_dict_filter_lte(self):
        sql = _compile_sql(_request(filters={'amount': {'operator': 'lte', 'value': 10}}))
        self.assertIn('<=', sql)

    def test_operator_dict_filter_in(self):
        sql = _compile_sql(_request(filters={'amount': {'operator': 'in', 'value': [1, 2]}}))
        self.assertIn('IN', sql.upper())

    def test_operator_dict_filter_between(self):
        sql = _compile_sql(_request(filters={'amount': {'operator': 'between', 'value': [1, 10]}}))
        self.assertIn('BETWEEN', sql.upper())

    def test_operator_dict_filter_between_wrong_arity_raises(self):
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(_request(filters={'amount': {'operator': 'between', 'value': [1]}}))
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(_request(filters={'amount': {'operator': 'between', 'value': [1, 5, 10]}}))

    def test_operator_dict_filter_between_non_list_raises(self):
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(_request(filters={'amount': {'operator': 'between', 'value': 10}}))

    def test_unknown_filter_field_raises(self):
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(_request(filters={'no_such_field': 1}))

    def test_unknown_operator_raises(self):
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(_request(filters={'amount': {'operator': 'like', 'value': 'x'}}))


# --------------------------------------------------------------------------- #
# Order by
# --------------------------------------------------------------------------- #

class TestOrderBy(unittest.TestCase):
    def test_order_by_asc_and_desc(self):
        sql = _compile_sql(_request(
            filters={'amount': 10},
            orderBy=[{'field': 'amount', 'direction': 'desc'}, {'field': 'id'}]))
        self.assertIn('ORDER BY', sql)
        self.assertIn('DESC', sql)
        self.assertIn('ASC', sql)

    def test_unknown_order_by_field_raises(self):
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(_request(filters={'amount': 10}, orderBy=[{'field': 'no_such_field'}]))

    def test_order_by_non_primary_attribute_triggers_join(self):
        # control: without orderBy on [region], the detail table is not joined
        sql_without = _compile_sql(_request(fields=['id'], filters={'amount': 10}))
        self.assertNotIn('topic_dm_holder', sql_without)
        # orderBy on an attribute whose sourceTable is the non-primary mapping
        sql_with = _compile_sql(_request(
            fields=['id'], filters={'amount': 10}, orderBy=[{'field': 'region'}]))
        self.assertIn('topic_dm_holder', sql_with)
        self.assertIn('JOIN', sql_with.upper())
        self.assertIn('ORDER BY', sql_with)

    def test_order_by_requested_derived_attribute(self):
        sql = _compile_sql(_request(
            fields=['id'], filters={'amount': 10},
            includeDerived=['holder_cnt'],
            orderBy=[{'field': 'holder_cnt', 'direction': 'desc'}]))
        self.assertIn('ORDER BY', sql)
        self.assertIn('holder_cnt DESC', sql)

    def test_order_by_unrequested_derived_attribute_raises(self):
        # derived attribute exists but was not requested via includeDerived
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(_request(
                fields=['id'], filters={'amount': 10}, orderBy=[{'field': 'holder_cnt'}]))


# --------------------------------------------------------------------------- #
# Group by
# --------------------------------------------------------------------------- #

class TestGroupBy(unittest.TestCase):
    def test_group_by_text_dimension(self):
        sql = _compile_sql(_request(filters={'amount': 10}, groupBy=[{'field': 'region'}]))
        self.assertIn('GROUP BY', sql)
        # region lives on the non-primary detail table, which must be joined
        self.assertIn('topic_dm_holder', sql)
        self.assertIn('JOIN', sql.upper())

    def test_group_by_auto_merges_plain_fields(self):
        # fields not listed in groupBy are merged into GROUP BY (only_full_group_by)
        sql = _compile_sql(_request(
            fields=['id'], filters={'amount': 10}, groupBy=[{'field': 'region'}]))
        self.assertIn('GROUP BY', sql)
        group_clause = sql.split('GROUP BY', 1)[1]
        self.assertIn('id', group_clause)
        self.assertIn('region', group_clause)

    def test_group_by_field_duplicated_in_fields_selected_once(self):
        sql = _compile_sql(_request(
            fields=['region'], filters={'amount': 10}, groupBy=[{'field': 'region'}]))
        self.assertEqual(sql.lower().count('as region'), 1)

    def test_group_by_empty_fields_selects_dimensions_only(self):
        sql = _compile_sql(_request(filters={'amount': 10}, groupBy=[{'field': 'region'}]))
        self.assertNotIn('amount AS', sql)

    def test_group_by_with_derived(self):
        sql = _compile_sql(_request(
            filters={'amount': 10}, groupBy=[{'field': 'region'}], includeDerived=['holder_cnt']))
        self.assertIn('GROUP BY', sql)
        self.assertIn('holder_cnt', sql)

    def test_group_by_time_granularity_postgresql(self):
        sql = _compile_sql(
            _request(filters={'amount': 10}, groupBy=[{'field': 'created', 'granularity': 'month'}]),
            dialect_name='postgresql', render_dialect=postgresql.dialect())
        self.assertIn('date_trunc', sql)
        self.assertIn('GROUP BY', sql)

    def test_group_by_time_granularity_mysql(self):
        sql = _compile_sql(
            _request(filters={'amount': 10}, groupBy=[{'field': 'created', 'granularity': 'month'}]),
            dialect_name='mysql', render_dialect=mysql.dialect())
        self.assertIn('DATE_FORMAT', sql.upper())

    def test_group_by_time_granularity_quarter_mysql(self):
        sql = _compile_sql(
            _request(filters={'amount': 10}, groupBy=[{'field': 'created', 'granularity': 'quarter'}]),
            dialect_name='mysql', render_dialect=mysql.dialect())
        self.assertIn('QUARTER', sql.upper())

    def test_group_by_without_granularity_selects_plain_column(self):
        sql = _compile_sql(
            _request(filters={'amount': 10}, groupBy=[{'field': 'created'}]),
            dialect_name='postgresql', render_dialect=postgresql.dialect())
        self.assertNotIn('date_trunc', sql)
        self.assertIn('GROUP BY', sql)

    def test_group_by_granularity_unsupported_dialect_raises(self):
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(
                _request(filters={'amount': 10}, groupBy=[{'field': 'created', 'granularity': 'month'}]),
                dialect_name='oracle')

    def test_unknown_group_by_field_raises(self):
        with self.assertRaises(OntologySqlCompileError):
            _compile_sql(_request(filters={'amount': 10}, groupBy=[{'field': 'no_such_field'}]))

    def test_order_by_grouped_dimension_uses_label(self):
        sql = _compile_sql(
            _request(filters={'amount': 10}, groupBy=[{'field': 'created', 'granularity': 'month'}],
                     orderBy=[{'field': 'created', 'direction': 'desc'}]),
            dialect_name='postgresql', render_dialect=postgresql.dialect())
        self.assertIn('ORDER BY created DESC', sql)


if __name__ == '__main__':
    unittest.main()
