#!/usr/bin/env python3
# -*- coding: utf-8 -*-


import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.metrics_meta_service import MetricService

from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.model.metrics import (
    Metric, MetricType, MetricTypeParams, MeasureReference
)

from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_metricflow.service.meta_service import save_semantic_model, save_metric
from watchmen_model.admin import User, UserRole


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('import_data.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)


class DataImportRunner:
    

    def __init__(self, tenant_id: str = "default_tenant", user_id: str = "admin"):
        
        self.tenant_id = tenant_id
        self.user_id = user_id

        
        self.principal_service = self._create_principal_service()

     
        self.semantic_model_service = SemanticModelService(
            ask_meta_storage(),
            ask_snowflake_generator(),
            self.principal_service
        )

        self.metric_service = MetricService(
            ask_meta_storage(),
            ask_snowflake_generator(),
            self.principal_service
        )

       

    def _create_principal_service(self) -> PrincipalService:
     
        mock_user = User(
            userId=self.user_id,
            tenantId=self.tenant_id,
            name="Admin User",
            role=UserRole.ADMIN,
            nickname="admin",
            password="", 
            isActive=True
        )

        return PrincipalService(mock_user)

    def load_semantic_manifest(self, file_path: str) -> Dict[str, Any]:
        
        if not file_path:
            raise ValueError("empty semantic manifest file path")

        manifest_path = Path(file_path)

        if not manifest_path.exists():
            raise FileNotFoundError(f"semantic manifest file not found: {file_path}")

        if not manifest_path.is_file():
            raise ValueError(f"semantic manifest: {file_path}")

        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # Validate basic structure
            if not isinstance(data, dict):
                raise ValueError("semantic manifest must be a JSON object")

            if 'semantic_models' not in data:
                logger.warning("semantic manifest file not found semantic_models field")
                data['semantic_models'] = []

            if not isinstance(data['semantic_models'], list):
                raise ValueError("semantic_models field must be a array")

            logger.info(f"Successfully loaded semantic manifest file: {file_path}, contains {len(data['semantic_models'])} semantic models")
            return data

        except json.JSONDecodeError as e:
            logger.error(f"semantic manifest file : {e}")   
            raise ValueError(f"semantic manifest file : {e}")
        except UnicodeDecodeError as e:
            logger.error(f"semantic manifest file encoding error: {e}")
            raise ValueError(f"semantic manifest file encoding error: {e}")
        except Exception as e:
            logger.error(f"import semantic manifest file failed: {e}")
            raise

    def parse_semantic_model(self, model_data: Dict[str, Any]) -> SemanticModel:
        
        if not isinstance(model_data, dict):
            raise ValueError("semantic model data must be a JSON object")

        if 'name' not in model_data or not model_data['name']:
            raise ValueError("semantic model name must be non-empty")

        model_name = model_data['name']
        required_fields = ['name']
        for field in required_fields:
            if field not in model_data:
                raise ValueError(f"semantic model data must contain field: {field}")

        semantic_model = SemanticModel.from_dict(model_data)

        semantic_model.id = str(self.semantic_model_service.snowflakeGenerator.next_id())
        semantic_model.tenantId = self.tenant_id
        semantic_model.createdAt = datetime.now()
        semantic_model.createdBy = self.user_id
        semantic_model.lastModifiedAt = datetime.now()
        semantic_model.lastModifiedBy = self.user_id
        semantic_model.version = 1

        logger.info(f" parsed semantic model: {semantic_model.name}")
        return semantic_model


            



       

    def create_metrics_from_measures(self, semantic_model: SemanticModel) -> List[Metric]:
        """Create metrics from semantic model measures"""
        if not semantic_model:
            raise ValueError("semantic_model must not be empty")

        if not hasattr(semantic_model, 'measures') or not semantic_model.measures:
            logger.info(f"Semantic model '{semantic_model.name}' has no measures, skip metric creation")
            return []

        metrics = []

        for measure in semantic_model.measures:
            if not hasattr(measure, 'create_metric') or not measure.create_metric:
                continue

            measure_name = getattr(measure, 'name', 'unknown')

            try:
                # Validate required fields of measure
                if not hasattr(measure, 'name') or not measure.name:
                    logger.warning(f"Measure missing name, skip metric creation")
                    continue

                if not hasattr(measure, 'expr') or not measure.expr:
                    logger.warning(f"Measure '{measure_name}' missing expr, skip metric creation")
                    continue

                # Create MetricTypeParams
                measure_ref = MeasureReference(
                    name=measure.name,
                    alias=getattr(measure, 'label', None)
                )

                type_params = MetricTypeParams(
                    measure=measure_ref,
                    expr=measure.expr
                )

                # Create metric data dict
                metric_name = f"{semantic_model.name}_{measure.name}"
                metric_data = {
                    "id": str(self.metric_service.snowflakeGenerator.next_id()),
                    "name": metric_name,
                    "description": getattr(measure, 'description',
                                           None) or f"Metric created from measure {measure.name} of {semantic_model.name}",
                    "type": MetricType.SIMPLE,
                    "type_params": type_params,
                    "metadata": getattr(measure, 'metadata', None),
                    "label": getattr(measure, 'label', None),
                    "tenantId": self.tenant_id,
                    "createdAt": datetime.now(),
                    "createdBy": self.user_id,
                    "lastModifiedAt": datetime.now(),
                    "lastModifiedBy": self.user_id,
                    "version": 1
                }

                # Create Metric object via model_validate
                metric = Metric.model_validate(metric_data)

                metrics.append(metric)
                logger.info(f"Created metric from measure {measure.name}: {metric.name}")

            except ValueError as e:
                logger.error(f"Data validation failed when creating metric '{measure_name}': {e}")
                continue
            except Exception as e:
                logger.error(f"Failed to create metric from measure {measure_name}: {e}")
                continue

        logger.info(f"Created {len(metrics)} metrics from semantic model '{semantic_model.name}'")
        return metrics

    def import_semantic_models(self, semantic_models_data: List[Dict[str, Any]]) -> List[SemanticModel]:
        """Import semantic models"""
        imported_models = []

        for model_data in semantic_models_data:
            # Parse semantic model
            semantic_model = self.parse_semantic_model(model_data)
            # Check for existing model with same name
            saved_model = save_semantic_model(self.principal_service, semantic_model)
            imported_models.append(saved_model)

            logger.info(f"Successfully imported semantic model: {saved_model}")

        return imported_models

    def import_metrics(self, metrics_data: List[Dict[str, Any]]) -> List[Metric]:
        """Import metrics"""
        imported_metrics = []

        for metric_data in metrics_data:
            try:
                print(metric_data)
                # Parse metric data
                metric = self.parse_metric(metric_data)

                # Save metric via service (auto-create or update if exists)
                saved_metric = save_metric(self.principal_service, metric)
                imported_metrics.append(saved_metric)

                logger.info(f"Successfully imported metric: {saved_metric.name}")

            except Exception as e:
                logger.error(f"Failed to import metric: {e}")


        logger.info(f"Successfully imported {len(imported_metrics)} metrics")
        return imported_metrics

    def parse_metric(self, metric_data: Dict[str, Any]) -> Metric:
        """Parse single metric data"""
        if not isinstance(metric_data, dict):
            raise ValueError("metric data must be a dict object")

        if 'name' not in metric_data or not metric_data['name']:
            raise ValueError("metric must contain a non-empty 'name' field")

        metric_name = metric_data['name']

        try:
            # Validate required fields
            required_fields = ['name', 'type']
            for field in required_fields:
                if field not in metric_data:
                    raise ValueError(f"Missing required field: {field}")

            # Set system fields
            metric_data['id'] = str(self.metric_service.snowflakeGenerator.next_id())
            metric_data['tenantId'] = self.tenant_id
            metric_data['createdAt'] = datetime.now()
            metric_data['createdBy'] = self.user_id
            metric_data['lastModifiedAt'] = datetime.now()
            metric_data['lastModifiedBy'] = self.user_id
            metric_data['version'] = 1

            # Create Metric object via model_validate
            metric = Metric.model_validate(metric_data)

            logger.info(f"Successfully parsed metric: {metric.name}")
            return metric

        except ValueError as e:
            logger.error(f"Data validation failed when parsing metric '{metric_name}': {e}")
            raise
        except Exception as e:
            logger.error(f"Failed to parse metric '{metric_name}': {e}")
            raise ValueError(f"Parse failed: {e}")

    def run_import(self, manifest_file_path: str) -> Dict[str, Any]:
        """Run data import"""
        start_time = datetime.now()
        logger.info(f"Start data import, time: {start_time}")

        try:
            # Load manifest file
            manifest_data = self.load_semantic_manifest(manifest_file_path)

            # Get semantic models data
            semantic_models_data = manifest_data.get('semantic_models', [])
            metrics_data = manifest_data.get('metrics', [])

            logger.info(f"Found {len(semantic_models_data)} semantic models")
            logger.info(f"Found {len(metrics_data)} metrics")

            # Import semantic models
            imported_models = self.import_semantic_models(semantic_models_data)

            # Import metrics
            imported_metrics = self.import_metrics(metrics_data)

            # TODO: If the manifest contains standalone metrics data, import them too
            # Currently the manifest contains only semantic_models, no standalone metrics

            end_time = datetime.now()
            duration = end_time - start_time

            result = {
                'success': True,
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'duration_seconds': duration.total_seconds(),
                'imported_semantic_models': len(imported_models),
                'imported_metrics': len(imported_metrics),
                'semantic_models': [model.name for model in imported_models],
                'metrics': [metric.name for metric in imported_metrics],
                'message': f'Successfully imported {len(imported_models)} semantic models and {len(imported_metrics)} metrics'
            }

            logger.info(f"Data import completed: {result['message']}, duration: {duration.total_seconds():.2f} seconds")
            return result

        except Exception as e:
            logger.error(f"Data import failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'Data import failed: {e}'
            }
#
#
# def main():
#     """Main function for command-line execution"""
#     # Default manifest file path
#     default_manifest_path = "/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-metricflow/src/watchmen_metricflow/import/semantic_manifest2.json"
#
#    
#     manifest_path = sys.argv[1] if len(sys.argv) > 1 else default_manifest_path
#
#     
#     runner = DataImportRunner(
#         tenant_id="941717860814777344",
#         user_id="941718042763684864"
#     )
#

#     result = runner.run_import(manifest_path)
#
#    
#     print(json.dumps(result, indent=2, ensure_ascii=False))
#
#       
#     sys.exit(0 if result['success'] else 1)
#
#
# if __name__ == "__main__":
#     main()
