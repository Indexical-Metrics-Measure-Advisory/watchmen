import unittest
from unittest.mock import MagicMock
from watchmen_metricflow.service.meta_service import build_profile
from watchmen_metricflow.model.semantic import SemanticModel, SemanticModelSourceType, NodeRelation

class TestBuildProfileDirectDB(unittest.TestCase):
    def test_build_profile_snowflake(self):
        semantic_model = MagicMock(spec=SemanticModel)
        semantic_model.sourceType = SemanticModelSourceType.DB_DIRECT
        
        node_relation = MagicMock(spec=NodeRelation)
        node_relation.databaseType = 'snowflake'
        node_relation.host = 'host' # Should be ignored
        node_relation.account = 'acc'
        node_relation.database = 'db'
        node_relation.warehouse = 'wh'
        node_relation.role = 'role'
        node_relation.schema_name = 'schema'
        node_relation.username = 'user'
        node_relation.password = 'pass'
        node_relation.port = 1234 # Should be ignored
        
        semantic_model.node_relation = node_relation
        
        principal_service = MagicMock()
        
        result = build_profile(semantic_model, principal_service)
        
        expected_output = {
            "type": "snowflake",
            "account": "acc",
            "database": "db",
            "warehouse": "wh",
            "role": "role",
            "schema": "schema",
            "user": "user",
            "password": "pass"
        }
        
        self.assertEqual(result["target"], "snowflake")
        self.assertEqual(result["outputs"]["snowflake"], expected_output)

    def test_build_profile_pgsql(self):
        semantic_model = MagicMock(spec=SemanticModel)
        semantic_model.sourceType = SemanticModelSourceType.DB_DIRECT
        
        node_relation = MagicMock(spec=NodeRelation)
        node_relation.databaseType = 'pgsql'
        node_relation.host = 'localhost'
        node_relation.port = 5432
        node_relation.database = 'mydb'
        node_relation.schema_name = 'public'
        node_relation.username = 'user'
        node_relation.password = 'pass'
        
        semantic_model.node_relation = node_relation
        
        principal_service = MagicMock()
        
        result = build_profile(semantic_model, principal_service)
        
        expected_output = {
            "type": "postgres",
            "host": "localhost",
            "port": 5432,
            "dbname": "mydb",
            "schema": "public",
            "user": "user",
            "password": "pass",
            "threads": 4,
            "keepalives_idle": 0,
            "connect_timeout": 10,
            "retries": 1
        }
        
        self.assertEqual(result["target"], "postgres")
        self.assertEqual(result["outputs"]["postgres"], expected_output)

if __name__ == '__main__':
    unittest.main()
