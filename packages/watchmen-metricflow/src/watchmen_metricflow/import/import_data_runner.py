#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据导入运行器
从semantic_manifest.json文件中读取semantic models和metrics数据，
并使用meta service的save方法导入到系统中。
"""

import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

from watchmen_auth import PrincipalService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.meta.metrics_meta_service import MetricService
# 导入服务类
from watchmen_metricflow.meta.semantic_meta_service import SemanticModelService
from watchmen_metricflow.model.metrics import (
    Metric, MetricType, MetricTypeParams, MeasureReference
)
# 导入模型类
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_metricflow.service.meta_service import save_semantic_model, save_metric
from watchmen_model.admin import User, UserRole

# 配置日志
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
    """数据导入运行器"""

    def __init__(self, tenant_id: str = "default_tenant", user_id: str = "admin"):
        """初始化导入运行器"""
        self.tenant_id = tenant_id
        self.user_id = user_id

        # 创建模拟的PrincipalService
        self.principal_service = self._create_principal_service()

        # 初始化服务
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

        logger.info(f"数据导入运行器初始化完成，租户ID: {tenant_id}, 用户ID: {user_id}")

    def _create_principal_service(self) -> PrincipalService:
        """创建模拟的PrincipalService"""
        # 创建模拟用户对象
        mock_user = User(
            userId=self.user_id,
            tenantId=self.tenant_id,
            name="Admin User",
            role=UserRole.ADMIN,
            nickname="admin",
            password="",  # 不需要真实密码
            isActive=True
        )

        return PrincipalService(mock_user)

    def load_semantic_manifest(self, file_path: str) -> Dict[str, Any]:
        """加载semantic_manifest.json文件"""
        if not file_path:
            raise ValueError("文件路径不能为空")

        manifest_path = Path(file_path)

        if not manifest_path.exists():
            raise FileNotFoundError(f"Manifest文件不存在: {file_path}")

        if not manifest_path.is_file():
            raise ValueError(f"路径不是文件: {file_path}")

        try:
            with open(manifest_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            # 验证基本结构
            if not isinstance(data, dict):
                raise ValueError("Manifest文件必须是JSON对象")

            if 'semantic_models' not in data:
                logger.warning("Manifest文件中没有找到semantic_models字段")
                data['semantic_models'] = []

            if not isinstance(data['semantic_models'], list):
                raise ValueError("semantic_models字段必须是数组")

            logger.info(
                f"成功加载semantic manifest文件: {file_path}, 包含 {len(data['semantic_models'])} 个semantic models")
            return data

        except json.JSONDecodeError as e:
            logger.error(f"Manifest文件JSON格式错误: {e}")
            raise ValueError(f"JSON格式错误: {e}")
        except UnicodeDecodeError as e:
            logger.error(f"文件编码错误: {e}")
            raise ValueError(f"文件编码错误，请确保文件是UTF-8编码: {e}")
        except Exception as e:
            logger.error(f"加载semantic manifest文件失败: {e}")
            raise

    def parse_semantic_model(self, model_data: Dict[str, Any]) -> SemanticModel:
        """解析单个semantic model数据"""
        if not isinstance(model_data, dict):
            raise ValueError("semantic model数据必须是字典对象")

        if 'name' not in model_data or not model_data['name']:
            raise ValueError("semantic model必须包含非空的name字段")

        model_name = model_data['name']

        try:
            # 验证必要字段
            required_fields = ['name']
            for field in required_fields:
                if field not in model_data:
                    raise ValueError(f"缺少必要字段: {field}")

            # 使用from_dict方法创建SemanticModel对象
            semantic_model = SemanticModel.from_dict(model_data)

            # 设置系统字段
            semantic_model.id = str(self.semantic_model_service.snowflakeGenerator.next_id())
            semantic_model.tenantId = self.tenant_id
            semantic_model.createdAt = datetime.now()
            semantic_model.createdBy = self.user_id
            semantic_model.lastModifiedAt = datetime.now()
            semantic_model.lastModifiedBy = self.user_id
            semantic_model.version = 1

            logger.info(f"成功解析semantic model: {semantic_model.name}")
            return semantic_model

        except ValueError as e:
            logger.error(f"解析semantic model '{model_name}' 时数据验证失败: {e}")
            raise
        except AttributeError as e:
            logger.error(f"解析semantic model '{model_name}' 时属性错误: {e}")
            raise ValueError(f"semantic model数据结构错误: {e}")
        except Exception as e:
            logger.error(f"解析semantic model '{model_name}' 失败: {e}")
            raise ValueError(f"解析失败: {e}")

    def create_metrics_from_measures(self, semantic_model: SemanticModel) -> List[Metric]:
        """从semantic model的measures创建metrics"""
        if not semantic_model:
            raise ValueError("semantic_model不能为空")

        if not hasattr(semantic_model, 'measures') or not semantic_model.measures:
            logger.info(f"Semantic model '{semantic_model.name}' 没有measures，跳过metric创建")
            return []

        metrics = []

        for measure in semantic_model.measures:
            if not hasattr(measure, 'create_metric') or not measure.create_metric:
                continue

            measure_name = getattr(measure, 'name', 'unknown')

            try:
                # 验证measure的必要字段
                if not hasattr(measure, 'name') or not measure.name:
                    logger.warning(f"Measure缺少name字段，跳过metric创建")
                    continue

                if not hasattr(measure, 'expr') or not measure.expr:
                    logger.warning(f"Measure '{measure_name}' 缺少expr字段，跳过metric创建")
                    continue

                # 创建MetricTypeParams
                measure_ref = MeasureReference(
                    name=measure.name,
                    alias=getattr(measure, 'label', None)
                )

                type_params = MetricTypeParams(
                    measure=measure_ref,
                    expr=measure.expr
                )

                # 创建Metric数据字典
                metric_name = f"{semantic_model.name}_{measure.name}"
                metric_data = {
                    "id": str(self.metric_service.snowflakeGenerator.next_id()),
                    "name": metric_name,
                    "description": getattr(measure, 'description',
                                           None) or f"从{semantic_model.name}的{measure.name}度量创建的指标",
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

                # 使用model_validate创建Metric对象
                metric = Metric.model_validate(metric_data)

                metrics.append(metric)
                logger.info(f"从measure {measure.name} 创建metric: {metric.name}")

            except ValueError as e:
                logger.error(f"创建metric '{measure_name}' 时数据验证失败: {e}")
                continue
            except Exception as e:
                logger.error(f"从measure {measure_name} 创建metric失败: {e}")
                continue

        logger.info(f"从semantic model '{semantic_model.name}' 创建了 {len(metrics)} 个metrics")
        return metrics

    def import_semantic_models(self, semantic_models_data: List[Dict[str, Any]]) -> List[SemanticModel]:
        """导入semantic models"""
        imported_models = []

        for model_data in semantic_models_data:
            # 解析semantic model
            semantic_model = self.parse_semantic_model(model_data)
            # 检查是否已存在同名模型
            saved_model = save_semantic_model(self.principal_service, semantic_model)
            imported_models.append(saved_model)

            logger.info(f"成功导入semantic model: {saved_model}")

        return imported_models

    def import_metrics(self, metrics_data: List[Dict[str, Any]]) -> List[Metric]:
        """导入metrics"""
        imported_metrics = []

        for metric_data in metrics_data:
            try:
                print(metric_data)
                # 解析metric数据
                metric = self.parse_metric(metric_data)

                # 使用save_metric服务保存metric（会自动检查是否存在并决定创建或更新）
                saved_metric = save_metric(self.principal_service, metric)
                imported_metrics.append(saved_metric)

                logger.info(f"成功导入metric: {saved_metric.name}")

            except Exception as e:
                logger.error(f"导入metric失败: {e}")


        logger.info(f"成功导入 {len(imported_metrics)} 个metrics")
        return imported_metrics

    def parse_metric(self, metric_data: Dict[str, Any]) -> Metric:
        """解析单个metric数据"""
        if not isinstance(metric_data, dict):
            raise ValueError("metric数据必须是字典对象")

        if 'name' not in metric_data or not metric_data['name']:
            raise ValueError("metric必须包含非空的name字段")

        metric_name = metric_data['name']

        try:
            # 验证必要字段
            required_fields = ['name', 'type']
            for field in required_fields:
                if field not in metric_data:
                    raise ValueError(f"缺少必要字段: {field}")

            # 设置系统字段
            metric_data['id'] = str(self.metric_service.snowflakeGenerator.next_id())
            metric_data['tenantId'] = self.tenant_id
            metric_data['createdAt'] = datetime.now()
            metric_data['createdBy'] = self.user_id
            metric_data['lastModifiedAt'] = datetime.now()
            metric_data['lastModifiedBy'] = self.user_id
            metric_data['version'] = 1

            # 使用model_validate创建Metric对象
            metric = Metric.model_validate(metric_data)

            logger.info(f"成功解析metric: {metric.name}")
            return metric

        except ValueError as e:
            logger.error(f"解析metric '{metric_name}' 时数据验证失败: {e}")
            raise
        except Exception as e:
            logger.error(f"解析metric '{metric_name}' 失败: {e}")
            raise ValueError(f"解析失败: {e}")

    def run_import(self, manifest_file_path: str) -> Dict[str, Any]:
        """运行数据导入"""
        start_time = datetime.now()
        logger.info(f"开始数据导入，时间: {start_time}")

        try:
            # 加载manifest文件
            manifest_data = self.load_semantic_manifest(manifest_file_path)

            # 获取semantic models数据
            semantic_models_data = manifest_data.get('semantic_models', [])
            metrics_data = manifest_data.get('metrics', [])

            logger.info(f"发现 {len(semantic_models_data)} 个semantic models")
            logger.info(f"发现 {len(metrics_data)} 个metrics")

            # 导入semantic models
            imported_models = self.import_semantic_models(semantic_models_data)

            # 导入metrics
            imported_metrics = self.import_metrics(metrics_data)

            # TODO: 如果manifest中有独立的metrics数据，也需要导入
            # 目前manifest中只有semantic_models，没有独立的metrics

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
                'message': f'成功导入 {len(imported_models)} 个semantic models 和 {len(imported_metrics)} 个metrics'
            }

            logger.info(f"数据导入完成: {result['message']}，耗时: {duration.total_seconds():.2f}秒")
            return result

        except Exception as e:
            logger.error(f"数据导入失败: {e}")
            return {
                'success': False,
                'error': str(e),
                'message': f'数据导入失败: {e}'
            }
#
#
# def main():
#     """主函数，用于命令行执行"""
#     # 默认的manifest文件路径
#     default_manifest_path = "/Users/yifeng/Documents/git_watchmen/watchmen/packages/watchmen-metricflow/src/watchmen_metricflow/import/semantic_manifest2.json"
#
#     # 可以从命令行参数获取文件路径
#     manifest_path = sys.argv[1] if len(sys.argv) > 1 else default_manifest_path
#
#     # 创建导入运行器
#     runner = DataImportRunner(
#         tenant_id="941717860814777344",
#         user_id="941718042763684864"
#     )
#
#     # 运行导入
#     result = runner.run_import(manifest_path)
#
#     # 输出结果
#     print(json.dumps(result, indent=2, ensure_ascii=False))
#
#     # 根据结果设置退出码
#     sys.exit(0 if result['success'] else 1)
#
#
# if __name__ == "__main__":
#     main()
