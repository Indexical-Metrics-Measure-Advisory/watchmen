from typing import List, Optional

from logging import getLogger

from watchmen_auth import PrincipalService
from watchmen_meta.admin import SpaceService, UserService, UserGroupService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_metricflow.model.metrics import Metric
from watchmen_metricflow.model.semantic import SemanticModel
from watchmen_metricflow.service.meta_service import get_semantic_model_service, get_metric_service
from watchmen_indicator_surface.util import trans_readonly
from watchmen_model.admin.space import Space
from watchmen_model.admin.user import User
from watchmen_model.admin.user_group import UserGroup
from watchmen_model.common import TenantId
from watchmen_utilities import ArrayHelper

logger = getLogger(__name__)


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

    def load_user() -> Optional[User]:
        return user_service.find_by_id(principal_service.get_user_id())

    user = trans_readonly(user_service, load_user)
    if not user or not user.groupIds:
        logger.info(
            'Console metric visibility: user[{0}] has no user group bound, no metric is visible.'
            .format(principal_service.get_user_id()))
        return []

    tenant_id = principal_service.get_tenant_id()

    def load_user_groups() -> List[UserGroup]:
        return user_group_service.find_by_ids(user.groupIds, tenant_id)

    user_groups = trans_readonly(user_group_service, load_user_groups)
    if not user_groups:
        logger.info('Console metric visibility: user groups[{0}] not found, no metric is visible.'
                    .format(user.groupIds))
        return []

    space_ids = ArrayHelper(user_groups).map(lambda x: x.spaceIds).flatten().filter(lambda x: x is not None).distinct().to_list()
    if not space_ids:
        logger.info('Console metric visibility: user groups[{0}] bind no space, no metric is visible.'
                    .format([g.name for g in user_groups]))
        return []

    def load_spaces() -> List[Space]:
        return space_service.find_by_ids(space_ids, tenant_id)

    spaces = trans_readonly(space_service, load_spaces)
    if not spaces:
        logger.info('Console metric visibility: spaces[{0}] not found, no metric is visible.'.format(space_ids))
        return []

    topic_ids = ArrayHelper(spaces).map(lambda x: x.topicIds).flatten().filter(lambda x: x is not None).distinct().to_list()
    logger.info('Console metric visibility: user[{0}] -> groups[{1}] -> spaces[{2}] -> topics[{3}].'.format(
        user.name, [g.name for g in user_groups],
        [(s.name, s.topicIds) for s in spaces], topic_ids))
    return topic_ids


def get_measure_names_with_create_metric(semantic_model: SemanticModel) -> set:
    """
    Nested models of ExtendedBaseModel subclasses hold raw dicts at runtime,
    so measures may be either dicts or Measure instances.
    """
    names = set()
    for measure in (semantic_model.measures or []):
        if isinstance(measure, dict):
            if measure.get('create_metric') and measure.get('name'):
                names.add(measure['name'])
        elif measure.create_metric and measure.name:
            names.add(measure.name)
    return names


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
        valid_measure_names = get_measure_names_with_create_metric(semantic_model)

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
            model_measures[model.name] = get_measure_names_with_create_metric(model)

        for metric in all_metrics:
            # Check if metric matches any semantic model
            for model_name, valid_measures in model_measures.items():
                prefix = f"{model_name}_"
                if metric.name.startswith(prefix):
                    measure_part = metric.name[len(prefix):]
                    if measure_part in valid_measures:
                        filtered_metrics.append(metric)
                        break  # Found a match, move to next metric

        logger.info(
            'Console metric visibility: topics[{0}] -> semantic models[{1}] -> '
            'total metrics[{2}] -> matched metrics[{3}].'.format(
                topic_ids,
                [(name, sorted(measures)) for name, measures in model_measures.items()],
                len(all_metrics),
                [m.name for m in filtered_metrics]))
        return filtered_metrics

    return trans_readonly(metric_service, action)
