"""PostgreSQL DDL templates for evolving an existing topic table.

build_columns_script emitted MySQL/Oracle style `ADD (col type)` and
`ALTER COLUMN (col TYPE type)`, which PostgreSQL rejects with a syntax error
(`syntax error at or near "("`). update_topic_entity swallows that error, so
the physical table silently stayed unchanged while the unique index rebuild
failed too, and materialization runs collided on the stale business key.
"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import _metric_test_base  # noqa: F401  sys.path bootstrap for sibling packages

from watchmen_model.admin import Factor, FactorType, Topic
from watchmen_storage_postgresql.table_creator import (
    build_columns_script,
    build_unique_indexes_script,
)


def make_factor(name, factor_type=FactorType.TEXT, index_group=None):
    return Factor(
        factorId=f'f-{name}', name=name, type=factor_type, indexGroup=index_group)


def make_topic(*factors):
    return Topic(
        topicId='topic-1', name='mat_x', dataSourceId='ds-1', factors=list(factors))


class TestBuildColumnsScript(unittest.TestCase):
    def test_new_factor_uses_postgresql_add_column(self):
        topic = make_topic(
            make_factor('statDate', FactorType.DATE),
            make_factor('notification_date'),
        )
        original = make_topic(make_factor('statDate', FactorType.DATE))

        scripts = build_columns_script(topic, original)

        self.assertIn('ALTER TABLE topic_mat_x ADD COLUMN notification_date VARCHAR(255)', scripts)
        self.assertIn('ALTER TABLE topic_mat_x ALTER COLUMN statdate TYPE DATE', scripts)
        for script in scripts:
            self.assertNotIn(' ADD (', script)
            self.assertNotIn('ALTER COLUMN (', script)

    def test_flatten_transition_also_uses_add_column(self):
        topic = make_topic(make_factor('statDate', FactorType.DATE))
        original = make_topic(make_factor('statDate', FactorType.DATE))
        original.factors[0].flatten = False
        topic.factors[0].flatten = True

        scripts = build_columns_script(topic, original)

        self.assertEqual(1, len(scripts))
        self.assertIn('ADD COLUMN statdate DATE', scripts[0])

    def test_raw_topic_extra_columns_are_unparenthesized(self):
        topic = make_topic(make_factor('data_'))
        original = make_topic(make_factor('data_'))
        topic.kind = 'RAW'
        original.kind = 'RAW'

        scripts = build_columns_script(topic, original)

        for script in scripts:
            self.assertNotIn(' ADD (', script)


class TestBuildUniqueIndexesScript(unittest.TestCase):
    def test_business_key_index_lists_key_columns(self):
        topic = make_topic(
            make_factor('statDate', FactorType.DATE, 'u-1'),
            make_factor('accident_time', FactorType.TEXT, 'u-1'),
            make_factor('notification_date', FactorType.TEXT, 'u-1'),
            make_factor('metricValue', FactorType.NUMBER),
        )

        scripts = build_unique_indexes_script(topic)

        self.assertEqual(1, len(scripts))
        self.assertIn(
            'CREATE UNIQUE INDEX u_topic_mat_x_1 ON topic_mat_x '
            '(statdate,accident_time,notification_date)',
            scripts[0])
