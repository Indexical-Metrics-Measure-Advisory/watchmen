import json
from datetime import datetime
from dbt.adapters.factory import get_adapter_by_type
from dbt_metricflow.cli.dbt_connectors.dbt_config_accessor import dbtArtifacts, dbtProjectMetadata
from dbt_semantic_interfaces.protocols import SemanticManifest
from decimal import Decimal
from metricflow_semantics.model.dbt_manifest_parser import parse_manifest_from_dbt_generated_manifest
from typing import Type, Self

# from watchmen_metricflow.service import ConfigService


def json_serializer(obj):
    """Custom JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")


saved_queries = []


# def get_config_service()->ConfigService:
#     return ConfigService()


raw_data = {
  "project_configuration": {
    "time_spine_table_configurations": [],
    "metadata": None,
    "dsi_package_version": {
      "major_version": "0",
      "minor_version": "7",
      "patch_version": "4"
    },
    "time_spines": [
      {
          ##TODO data source todo
        "node_relation": {
          "alias": "all_days",
          "schema_name": "life_metrics",
          "database": "postgres",
          "relation_name": "\"postgres\".\"life_metrics\".\"all_days\""
        },
        "primary_column": {
          "name": "date_day",
          "time_granularity": "day"
        },
        "custom_granularities": []
      }
    ]
  },
  "saved_queries": [],
  "semantic_models":[],
  "metrics":[]
}



class DBTArtifactsWatchmen(dbtArtifacts):

    @classmethod
    def load_from_project_metadata(cls: Type[Self], project_metadata: dbtProjectMetadata,semantic_models , metrics ) -> Self:

        adapter = get_adapter_by_type(project_metadata.profile.credentials.type)

        # todo add schema info
        raw_semantic_manifest  = raw_data # load from file system semantic manifest.json
        
        raw_semantic_manifest["semantic_models"] = semantic_models.model_dump() if hasattr(semantic_models, 'model_dump') else [item.model_dump() if hasattr(item, 'model_dump') else item for item in semantic_models]
        raw_semantic_manifest["metrics"] = metrics.model_dump() if hasattr(metrics, 'model_dump') else [item.model_dump() if hasattr(item, 'model_dump') else item for item in metrics]

        # print(raw_semantic_manifest)
        # load semantic_manifest from watchmen config
        semantic_manifest:SemanticManifest = parse_manifest_from_dbt_generated_manifest(manifest_json_string=json.dumps(raw_semantic_manifest, default=json_serializer))
        # semantic_manifest = dbtArtifacts.build_semantic_manifest_from_dbt_project_root(
        #     project_root=project_metadata.project_path

        return cls(
            profile=project_metadata.profile,
            project=project_metadata.project,
            adapter=adapter,
            semantic_manifest=semantic_manifest,
        )

    def load_artifacts(self,semantic_models,metrics):
        pass


    def build_schema_name(self) -> str:
        return "public"

    def build_relation_name(self):
        return "watchmen_metricflow"


