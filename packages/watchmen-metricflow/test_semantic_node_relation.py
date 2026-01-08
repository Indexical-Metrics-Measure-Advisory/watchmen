import unittest
from watchmen_metricflow.model.semantic import NodeRelation

class TestNodeRelation(unittest.TestCase):
    def test_node_relation_fields(self):
        data = {
            "alias": "test_alias",
            "schema_name": "test_schema",
            "database": "test_db",
            "relation_name": "test_rel",
            "databaseType": "snowflake",
            "host": "localhost",
            "port": 5432,
            "username": "user",
            "password": "password",
            "account": "acc",
            "warehouse": "wh",
            "role": "role"
        }
        node = NodeRelation.from_dict(data)
        self.assertEqual(node.alias, "test_alias")
        self.assertEqual(node.databaseType, "snowflake")
        self.assertEqual(node.port, 5432)
        self.assertEqual(node.account, "acc")
        
    def test_node_relation_optional(self):
        data = {
            "alias": "test_alias",
            "schema_name": "test_schema",
            "database": "test_db",
            "relation_name": "test_rel"
        }
        node = NodeRelation.from_dict(data)
        self.assertEqual(node.alias, "test_alias")
        self.assertIsNone(node.databaseType)

if __name__ == '__main__':
    unittest.main()
