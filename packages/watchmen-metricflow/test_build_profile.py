import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add src to path
sys.path.append(os.path.abspath("src"))
sys.path.append(os.path.abspath("../watchmen-model/src"))
sys.path.append(os.path.abspath("../watchmen-meta/src"))
sys.path.append(os.path.abspath("../watchmen-auth/src"))
sys.path.append(os.path.abspath("../watchmen-utilities/src"))
sys.path.append(os.path.abspath("../watchmen-storage/src"))
sys.path.append(os.path.abspath("../watchmen-indicator-surface/src"))

from watchmen_metricflow.service.meta_service import build_profile
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_model.system import DataSource, DataSourceType, DataSourceParam
from watchmen_model.admin import Topic

class TestBuildProfile(unittest.TestCase):
    
    @patch("watchmen_metricflow.service.meta_service.get_topic_service")
    @patch("watchmen_metricflow.service.meta_service.get_data_source_service")
    @patch("watchmen_metricflow.service.meta_service.trans_readonly")
    def test_build_profile_postgres(self, mock_trans, mock_get_ds_service, mock_get_topic_service):
        # Setup
        mock_trans.side_effect = lambda service, action: action()
        
        mock_topic_service = MagicMock()
        mock_get_topic_service.return_value = mock_topic_service
        
        mock_ds_service = MagicMock()
        mock_get_ds_service.return_value = mock_ds_service
        
        semantic_model = SemanticModel(sourceType="topic", topicId="t1")
        topic = Topic(topicId="t1", dataSourceId="ds1")
        data_source = DataSource(
            dataSourceType=DataSourceType.POSTGRESQL,
            host="localhost",
            port="5432",
            username="user",
            password="pwd",
            name="mydb",
            params=[DataSourceParam(name="schema", value="public")]
        )
        
        mock_topic_service.find_by_id.return_value = topic
        mock_ds_service.find_by_id.return_value = data_source
        
        # Execute
        result = build_profile(semantic_model, MagicMock())
        
        # Verify
        self.assertEqual(result["target"], "postgres")
        self.assertEqual(result["outputs"]["postgres"]["type"], "postgres")
        self.assertEqual(result["outputs"]["postgres"]["schema"], "public")

    @patch("watchmen_metricflow.service.meta_service.get_topic_service")
    @patch("watchmen_metricflow.service.meta_service.get_data_source_service")
    @patch("watchmen_metricflow.service.meta_service.trans_readonly")
    def test_build_profile_mysql(self, mock_trans, mock_get_ds_service, mock_get_topic_service):
        # Setup
        mock_trans.side_effect = lambda service, action: action()
        mock_topic_service = MagicMock()
        mock_get_topic_service.return_value = mock_topic_service
        mock_ds_service = MagicMock()
        mock_get_ds_service.return_value = mock_ds_service
        
        semantic_model = SemanticModel(sourceType="topic", topicId="t1")
        topic = Topic(topicId="t1", dataSourceId="ds1")
        data_source = DataSource(
            dataSourceType=DataSourceType.MYSQL,
            host="localhost",
            port="3306",
            username="root",
            password="pwd",
            name="mydb"
        )
        
        mock_topic_service.find_by_id.return_value = topic
        mock_ds_service.find_by_id.return_value = data_source
        
        # Execute
        result = build_profile(semantic_model, MagicMock())
        
        # Verify
        self.assertEqual(result["target"], "mysql")
        self.assertEqual(result["outputs"]["mysql"]["type"], "mysql")
        self.assertEqual(result["outputs"]["mysql"]["schema"], "mydb")

    @patch("watchmen_metricflow.service.meta_service.get_topic_service")
    @patch("watchmen_metricflow.service.meta_service.get_data_source_service")
    @patch("watchmen_metricflow.service.meta_service.trans_readonly")
    def test_build_profile_mssql(self, mock_trans, mock_get_ds_service, mock_get_topic_service):
        # Setup
        mock_trans.side_effect = lambda service, action: action()
        mock_topic_service = MagicMock()
        mock_get_topic_service.return_value = mock_topic_service
        mock_ds_service = MagicMock()
        mock_get_ds_service.return_value = mock_ds_service
        
        semantic_model = SemanticModel(sourceType="topic", topicId="t1")
        topic = Topic(topicId="t1", dataSourceId="ds1")
        data_source = DataSource(
            dataSourceType=DataSourceType.MSSQL,
            host="localhost",
            port="1433",
            username="sa",
            password="pwd",
            name="mydb"
        )
        
        mock_topic_service.find_by_id.return_value = topic
        mock_ds_service.find_by_id.return_value = data_source
        
        # Execute
        result = build_profile(semantic_model, MagicMock())
        
        # Verify
        self.assertEqual(result["target"], "mssql")
        self.assertEqual(result["outputs"]["mssql"]["type"], "mssql")
        self.assertEqual(result["outputs"]["mssql"]["schema"], "dbo")

    @patch("watchmen_metricflow.service.meta_service.get_topic_service")
    @patch("watchmen_metricflow.service.meta_service.get_data_source_service")
    @patch("watchmen_metricflow.service.meta_service.trans_readonly")
    def test_build_profile_oracle(self, mock_trans, mock_get_ds_service, mock_get_topic_service):
        # Setup
        mock_trans.side_effect = lambda service, action: action()
        mock_topic_service = MagicMock()
        mock_get_topic_service.return_value = mock_topic_service
        mock_ds_service = MagicMock()
        mock_get_ds_service.return_value = mock_ds_service
        
        semantic_model = SemanticModel(sourceType="topic", topicId="t1")
        topic = Topic(topicId="t1", dataSourceId="ds1")
        data_source = DataSource(
            dataSourceType=DataSourceType.ORACLE,
            host="localhost",
            port="1521",
            username="scott",
            password="tiger",
            name="orcl"
        )
        
        mock_topic_service.find_by_id.return_value = topic
        mock_ds_service.find_by_id.return_value = data_source
        
        # Execute
        result = build_profile(semantic_model, MagicMock())
        
        # Verify
        self.assertEqual(result["target"], "oracle")
        self.assertEqual(result["outputs"]["oracle"]["type"], "oracle")
        self.assertEqual(result["outputs"]["oracle"]["schema"], "scott")

if __name__ == "__main__":
    unittest.main()
