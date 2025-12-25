from typing import List

from watchmen_auth import PrincipalService
from watchmen_meta.admin import SpaceService, UserService, UserGroupService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.model.metrics import Metric
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_metricflow.service.meta_service import get_semantic_model_service, get_metric_service
from watchmen_indicator_surface.util import trans_readonly
from watchmen_model.common import TenantId
from watchmen_utilities import ArrayHelper


def get_space_service(principal_service: PrincipalService) -> SpaceService:
    return SpaceService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_service(principal_service: PrincipalService) -> UserService:
    return UserService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_user_group_service(principal_service: PrincipalService) -> UserGroupService:
    return UserGroupService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_console_user_topic_ids(principal_service: PrincipalService) -> List[str]:
    user_service = get_user_service(principal_service)
    user_group_service = get_user_group_service(principal_service)
    space_service = get_space_service(principal_service)

    def action() -> List[str]:
        user_id = principal_service.get_user_id()
        tenant_id = principal_service.get_tenant_id()
        user = user_service.find_by_id(user_id)
        if not user or not user.groupIds:
            return []

        user_groups = user_group_service.find_by_ids(user.groupIds, tenant_id)
        if not user_groups:
            return []

        space_ids = ArrayHelper(user_groups).flat_map(lambda x: x.spaceIds).distinct().to_list()
        if not space_ids:
            return []

        spaces = space_service.find_by_ids(space_ids, tenant_id)
        if not spaces:
            return []

        return ArrayHelper(spaces).flat_map(lambda x: x.topicIds).distinct().to_list()

    return trans_readonly(user_service, action)


def find_semantic_models_by_topic_ids(principal_service: PrincipalService, topic_ids: List[str],
                                      tenant_id: str) -> List[SemanticModel]:
    semantic_model_service = get_semantic_model_service(principal_service)

    def action() -> List[SemanticModel]:
        # load semantic models by tenant_id
        semantic_models = semantic_model_service.find_all(tenant_id)
        # filter semantic models by topic_ids
        return [
            model for model in semantic_models
            if model.topicId in topic_ids
        ]

    return trans_readonly(semantic_model_service, action)


def find_metrics_by_semantic_model(principal_service: PrincipalService, semantic_model: SemanticModel,
                                   tenant_id: str) -> List[Metric]:
    metric_service = get_metric_service(principal_service)

    def action() -> List[Metric]:
        # load metrics by tenant_id
        metrics = metric_service.find_all(tenant_id)

        # filter metrics by semantic_model
        # Metric name pattern: {semantic_model.name}_{measure.name}
        prefix = f"{semantic_model.name}_"

        # Get valid measure names for this semantic model
        valid_measure_names = {
            measure.name
            for measure in semantic_model.measures
            if measure.create_metric
        }

        filtered_metrics = []
        for metric in metrics:
            if metric.name.startswith(prefix):
                measure_part = metric.name[len(prefix):]
                if measure_part in valid_measure_names:
                    filtered_metrics.append(metric)

        return filtered_metrics

    return trans_readonly(metric_service, action)


def find_metrics_by_topic_ids(principal_service: PrincipalService, topic_ids: List[str], tenant_id: str) -> List[Metric]:
    semantic_models = find_semantic_models_by_topic_ids(principal_service, topic_ids, tenant_id)
    metric_service = get_metric_service(principal_service)

    def action() -> List[Metric]:
        all_metrics = metric_service.find_all(tenant_id)
        filtered_metrics = []

        # Pre-calculate valid measures for each semantic model
        # Map: semantic_model_name -> set(valid_measure_names)
        model_measures = {}
        for model in semantic_models:
            valid_measures = {
                measure.name
                for measure in model.measures
                if measure.create_metric
            }
            model_measures[model.name] = valid_measures

        for metric in all_metrics:
            # Check if metric matches any semantic model
            for model_name, valid_measures in model_measures.items():
                prefix = f"{model_name}_"
                if metric.name.startswith(prefix):
                    measure_part = metric.name[len(prefix):]
                    if measure_part in valid_measures:
                        filtered_metrics.append(metric)
                        break  # Found a match, move to next metric
        return filtered_metrics

    return trans_readonly(metric_service, action)
