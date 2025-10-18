from typing import List, Dict

import humanize
from fastapi import Depends, APIRouter
from pydantic import BaseModel

from watchmen_ai.hypothesis.meta.metric_meta_service import MetricService
from watchmen_ai.hypothesis.model.metrics import MetricType, MetricStatus, MetricDetailType, MetricFlowMetric
from watchmen_ai.hypothesis.service.metric_service import find_dimension_by_metric, load_all_metrics_from_mf
from watchmen_auth import PrincipalService
from watchmen_indicator_kernel.data import ObjectiveDataService, ObjectiveValues, ObjectiveTargetValues
from watchmen_indicator_kernel.meta import ObjectiveService, IndicatorService
from watchmen_indicator_surface.servcie.objective_analysis_service import find_available_objectives
from watchmen_indicator_surface.util import trans
from watchmen_lineage.utils.utils import trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.common import ObjectiveTargetId
from watchmen_model.indicator import Objective, ObjectiveTarget, ObjectiveTargetBetterSide
from watchmen_rest import get_any_principal

router = APIRouter()


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
    return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
    return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_data_service(objective: Objective, principal_service: PrincipalService) -> ObjectiveDataService:
    return ObjectiveDataService(objective, principal_service)


def convert_better_side_to_metric_status(better_side: ObjectiveTargetBetterSide) -> MetricStatus:
    """
    Convert the better side of the objective target to metric status.
    :param better_side:
    :return:
    """
    if better_side == ObjectiveTargetBetterSide.LESS:
        return MetricStatus.NEGATIVE
    elif better_side == ObjectiveTargetBetterSide.MORE:
        return MetricStatus.POSITIVE
    else:
        return MetricStatus.NEUTRAL


def convert_objective_target_to_metric(
        objective_target_list: List[ObjectiveTarget], target_values: Dict[ObjectiveTargetId, ObjectiveTargetValues],
        objective: Objective) -> List[MetricType]:
    """

    :param objective_target_list:
    :return:
    """
    metric_list: List[MetricType] = []
    for objective_target in objective_target_list:
        target_value: ObjectiveTargetValues = target_values[objective_target.uuid]
        metric: MetricType = MetricType(
            id=objective_target.uuid,
            name=objective_target.name,
            description=objective_target.description,
            status=convert_better_side_to_metric_status(objective_target.betterSide),
            targetId=objective_target.uuid,
            value=target_value.currentValue,
            valueReadable=humanize.metric(target_value.currentValue),
            change=target_value.changeValue,
            objectiveId=objective.objectiveId
        )

        metric_list.append(metric)

    return metric_list


@router.get("/metrics", tags=["hypothesis"])
async def load_metrics(
        principal_service: PrincipalService = Depends(get_any_principal)):

    tenant_id = principal_service.get_tenant_id()
    user_id = principal_service.get_user_id()
    metric_service: MetricService = get_metric_service(principal_service)
    all_metrics:List[MetricFlowMetric] =  await load_all_metrics_from_mf(principal_service)


    def load_metrics_action() -> List[MetricType]:
        # noinspection PyTypeChecker
        return metric_service.find_all_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())

    def save_metrics_action(metrics: List[MetricType]) -> List[MetricType]:
        # noinspection PyTypeChecker
        result = []
        for metric in metrics:
            metric.tenantId = principal_service.get_tenant_id()
            metric.userId = principal_service.get_user_id()
            if metric.id is None:
                metric_service.redress_storable_id(metric)
                result.append(metric_service.update(metric))
            else:
                result.append(metric_service.create(metric))

        return result
    metrics: List[MetricType] = trans_readonly(metric_service, load_metrics_action)
    # find target values
    if metrics is None or len(metrics) == 0:
        metrics = []
        for external_metric in all_metrics:
            # if external metric not exists in metrics, then create it
            new_metric = MetricType(
                id=str(metric_service.snowflakeGenerator.next_id()),
                name=external_metric.name,
                description=external_metric.description,
                status=MetricStatus.NEUTRAL,
                tenantId=principal_service.tenantId,
                userId=user_id
            )
            metrics.append(new_metric)

        metrics =  trans(metric_service, lambda: save_metrics_action(metrics))

    return metrics
    # for external_metric in all_metrics:
    #     for metric in metrics:
    #         # if external metric already exists in metrics, then update it
    #         if metric.name == external_metric.name:
    #             # metric.value = external_metric.value
    #             # metric.valueReadable = humanize.metric(external_metric.value)
    #             # metric.change = external_metric.change
    #             # metric.changeReadable = humanize.metric(external_metric.change)
    #             metric.status = MetricStatus.NEUTRAL
    #         else:
    #             # if external metric not exists in metrics, then create it
    #             new_metric = MetricType(
    #                 id=external_metric.id,
    #                 name=external_metric.name,
    #                 description=external_metric.description,
    #
    #
    #                 # tenantId=tenant_id,
    #                 # userId=user_id
    #             )
    #             metrics.append(new_metric)




    # return trans(metric_service, lambda: save_metrics_action(metrics))



async def find_target_value(objective_service, principal_service, tenant_id, user_id):
    available_objectives: List[Objective] = await find_available_objectives(tenant_id, user_id, objective_service)
    # run objective data
    target_values: Dict[ObjectiveTargetId, ObjectiveTargetValues] = {}
    for objective in available_objectives:
        objective_data_service = get_objective_data_service(objective, principal_service)
        values: ObjectiveValues = objective_data_service.ask_values()
        for target_value in values.targets:
            target_values[target_value.uuid] = target_value
    return available_objectives, target_values


@router.post("/metric", tags=["hypothesis"])
async def save_metrics(
        metric: MetricType,
        principal_service: PrincipalService = Depends(get_any_principal)):
    metric_service: MetricService = get_metric_service(principal_service)

    def save_metrics_action() -> MetricType:
        # noinspection PyTypeChecker
        # metric_service.redress_storable_id(metric)

        return metric_service.update(metric)

    return trans(metric_service, save_metrics_action)


class MetricsSuggestReq(BaseModel):
    title: str
    description: str


@router.post("/metrics/suggest", tags=["hypothesis"])
async def recommend_metrics(
        metrics_req: MetricsSuggestReq,
        principal_service: PrincipalService = Depends(get_any_principal)):
    metric_service: MetricService = get_metric_service(principal_service)

    def load_metrics_action() -> List[MetricType]:
        # noinspection PyTypeChecker
        return metric_service.find_all_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())

    return trans_readonly(metric_service, load_metrics_action)


@router.get("/metric/{metric_id}", tags=["hypothesis"])
async def load_metric(metric_id: str, principal_service: PrincipalService = Depends(get_any_principal)):
    metric_service: MetricService = get_metric_service(principal_service)

    def load_metric():
        return metric_service.find_by_id(metric_id)

    metric: MetricType = trans_readonly(metric_service, load_metric)
    if metric:
        dimensions = await  find_dimension_by_metric(metric, principal_service)
        return MetricDetailType(metric=metric, dimensions=dimensions)
    else:
        return MetricDetailType(metric=metric, dimensions=[])


@router.get("/metrics/key", tags=["hypothesis"])
async def load_key_metrics(principal_service: PrincipalService = Depends(get_any_principal)):
    metric_service: MetricService = get_metric_service(principal_service)

    def load_metrics_action() -> List[MetricType]:
        # noinspection PyTypeChecker
        return metric_service.find_all_by_user_id(principal_service.get_user_id(), principal_service.get_tenant_id())

    available_metrics = trans_readonly(metric_service, load_metrics_action)

    # find key metrics
    key_metrics = []

    return available_metrics
