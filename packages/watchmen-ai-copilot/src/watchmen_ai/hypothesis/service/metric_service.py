import json
from typing import List, Optional, Any

import requests
from pydantic import BaseModel

from watchmen_ai.hypothesis.meta.metric_meta_service import MetricService
from watchmen_ai.hypothesis.model.metrics import MetricType, MetricDimension, DimensionType, MetricDetailType, \
    MetricFlowMetric
from watchmen_ai.hypothesis.model.mf_model import MetricQueryRequest
from watchmen_auth import PrincipalService
from watchmen_data_kernel.storage_bridge import PossibleParameterType
from watchmen_indicator_kernel.meta import ObjectiveService, IndicatorService
from watchmen_inquiry_kernel.helper.subject_helper import add_column_type_to_subject
from watchmen_lineage.utils.utils import is_datetime, trans_readonly
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import SubjectService
from watchmen_model.admin import FactorType
from watchmen_model.admin import Topic, Factor
from watchmen_model.common import TopicId
from watchmen_model.console import Subject
from watchmen_model.console.subject_ext import SubjectWithFactorType, SubjectDatasetColumnWithType, \
    SubjectDatasetWithType
from watchmen_model.indicator import Indicator, \
    IndicatorBaseOn, ObjectiveTarget, Objective, ComputedObjectiveParameter, ObjectiveFactor, ObjectiveFactorKind


class MetricFlowResponse(BaseModel):
    """Pydantic model for MetricFlow query results."""
    data: Any
    column_names: List[str]


def get_topic_service(principal_service: PrincipalService) -> TopicService:
    return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_objective_service(principal_service: PrincipalService) -> ObjectiveService:
    return ObjectiveService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_indicator_service(principal_service: PrincipalService) -> IndicatorService:
    return IndicatorService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subject_service(principal_service: PrincipalService) -> SubjectService:
    return SubjectService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_metric_service(principal_service: PrincipalService) -> MetricService:
    return MetricService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def is_time_dimension(factor: Factor) -> bool:
    """
    Check if the factor is a time dimension.
    :param factor: The factor object.
    :return: True if it's a time dimension, False otherwise.
    """
    # Placeholder for checking if the factor is a time dimension
    return is_datetime(factor)


def is_str(factor: Factor) -> bool:
    """
    Check if the value is a string.
    :param value: The value to check.
    :return: True if it's a string, False otherwise.
    """
    return factor.type == FactorType.TEXT


def is_number(factor: Factor) -> bool:
    """
    Check if the value is a number.
    :param value: The value to check.
    :return: True if it's a number, False otherwise.
    """
    return factor.type == FactorType.NUMBER


def find_time_dimensions_in_factors(factors: List[Factor]):
    """

    :param factors:
    :return:
    """
    # Placeholder for finding time dimensions in factors
    dimension_list: List[MetricDimension] = []

    for factor in factors:
        if is_time_dimension(factor):
            dimension_list.append(MetricDimension(
                id=factor.factorId,
                name=factor.name,
                factorType=factor.type,
                dimensionType=DimensionType.TIME,
                description=factor.description
            ))
        elif is_str(factor):
            dimension_list.append(MetricDimension(
                id=factor.factorId,
                name=factor.name,
                factorType=factor.type,
                dimensionType=DimensionType.TEXT,
                description=factor.description
            ))
        elif is_number(factor):
            dimension_list.append(MetricDimension(
                id=factor.factorId,
                name=factor.name,
                factorType=factor.type,
                dimensionType=DimensionType.NUMERICAL,
                description=factor.description
            ))
    return dimension_list


async def find_indicator_by_metric(metric: MetricType, principal_service: PrincipalService):
    """
    Find dimensions in metric.
    :param metric: The metric object.
    :return: A list of dimension names.
    """
    # load objective and target
    objective_service = get_objective_service(principal_service)
    indicator_service = get_indicator_service(principal_service)

    def load_objective():
        return objective_service.find_by_id(metric.objectiveId)

    objective: Objective = trans_readonly(objective_service, load_objective)


async def find_dimensions_in_topic(topic: Topic) -> List[MetricDimension]:
    """
    Find dimensions in topic.
    :param topic: The topic object.
    :return: A list of dimension names.
    """

    # find all factors in the topic
    factors: List[Factor] = topic.factors

    return find_time_dimensions_in_factors(factors)


def is_data_dimension_type(column_type: str):
    return column_type in [PossibleParameterType.DATE, PossibleParameterType.DATETIME, PossibleParameterType.TIME]


async def find_dimensions_in_subject(subject: Subject, principal_service: PrincipalService) -> List[MetricDimension]:
    """
    Find dimensions in subject.
    :param subject: The subject object.
    :return: A list of dimension names.
    """
    time_dimension_list = []

    subject_with_type: SubjectWithFactorType = add_column_type_to_subject(subject, principal_service)

    dataset: SubjectDatasetWithType = subject_with_type.dataset

    if dataset:
        columns: List[SubjectDatasetColumnWithType] = dataset.columns
        if columns:
            for column in columns:
                if is_data_dimension_type(column.columnType):
                    time_dimension_list.append(MetricDimension(
                        id=column.id,
                        name=column.name,
                        factorType=PossibleParameterType(column.columnType),
                        dimensionType=DimensionType.TIME
                    ))

    return time_dimension_list


async def find_dimensions_by_indicator(indicator: Indicator, principal_service: PrincipalService) -> List[
    MetricDimension]:
    topic_service: TopicService = get_topic_service(principal_service)
    subject_service: SubjectService = get_subject_service(principal_service)

    if indicator.baseOn == IndicatorBaseOn.TOPIC:
        topic_id: TopicId = indicator.topicOrSubjectId

        def load_topic():  # Added missing parentheses here
            return topic_service.find_by_id(topic_id)

        topic: Topic = trans_readonly(topic_service, load_topic)
        dimensions = await find_dimensions_in_topic(topic)
        return dimensions

    elif indicator.baseOn == IndicatorBaseOn.SUBJECT:
        subject_id = indicator.topicOrSubjectId

        # Implement subject-based dimension finding if needed

        def load_subject():
            return subject_service.find_by_id(subject_id)

        subject: Subject = trans_readonly(subject_service, load_subject)

        dimensions = await find_dimensions_in_subject(subject)
        return dimensions

    else:
        return []


def is_objective_factor(target):
    if isinstance(target.asis, ComputedObjectiveParameter):
        return False
    else:
        return True


def load_indicator(indicator_service: IndicatorService, indicator_id: str):
    return indicator_service.find_by_id(indicator_id)


def find_indicator_by_objective(objective: Objective, target_id: str, indicator_service: IndicatorService) -> Optional[
    Indicator]:
    objective_target_list = objective.targets
    target: ObjectiveTarget = next((target for target in objective_target_list if target.uuid == target_id), None)
    if target is None:
        raise ValueError(f"Target with ID {target_id} not found in objective targets.")

    if is_objective_factor(target):
        factor_id = target.asis
        # find factor in objective
        object_factor: ObjectiveFactor = next((factor for factor in objective.factors if factor.uuid == factor_id),
                                              None)

        if object_factor.kind == ObjectiveFactorKind.INDICATOR:
            indicator: Indicator = trans_readonly(indicator_service,
                                                  lambda: load_indicator(indicator_service, object_factor.indicatorId))
            return indicator
        else:
            return None
    else:
        return None


async def find_dimension_by_metric(metric: MetricType, principal_service: PrincipalService):
    """
    Find dimensions in metric.
    :param metric: The metric object.
    :return: A list of dimension names.
    """
    # load objective and target

    return load_dimensions_by_metrics([metric.name])


async def load_metrics_from_definition(
        principal_service: PrincipalService
) -> List[MetricDetailType]:
    metric_service: MetricService = get_metric_service(principal_service)
    result: List[MetricDetailType] = []

    def load_metric():
        return metric_service.find_all(principal_service.get_tenant_id())

    metrics: List[MetricType] = trans_readonly(metric_service, load_metric)
    if metrics:
        for metric in metrics:
            dimensions = await find_dimension_by_metric(metric, principal_service)
            result.append(MetricDetailType(metric=metric))
    return result


async def load_all_metrics(
        principal_service: PrincipalService
) -> List[MetricDetailType]:
    """
    Load all metrics from the metric service.
    :param principal_service: The principal service for authentication.
    :return: A list of MetricDetailType objects.
    """
    metric_service: MetricService = get_metric_service(principal_service)
    result: List[MetricDetailType] = []

    def load_metric():
        return metric_service.find_all(principal_service.get_tenant_id())

    metrics: List[MetricType] = trans_readonly(metric_service, load_metric)

    if metrics:
        for metric in metrics:
            dimensions = await find_dimension_by_metric(metric, principal_service)
            result.append(MetricDetailType(metric=metric, dimensions=dimensions))

    return result


def load_dimensions_by_metrics(metrics: List[str]) -> List[MetricDimension]:
    url = " http://127.0.0.1:8910/find_dimensions"
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    response = requests.post(url, headers=headers, data=json.dumps(metrics))
    results = response.json()
    dimensions_result = []
    for result in results:
        # noinspection PyArgumentList

        # print("result",result)
        dimension = MetricDimension(name=result['name'], qualified_name=result['qualified_name'],
                                    dimensionType=DimensionType(result['type']))
        dimensions_result.append(dimension)

    return dimensions_result


async def load_all_metrics_from_mf(
        principal_service: PrincipalService
) -> List[MetricFlowMetric]:
    """
    Load all metrics from the metric service.
    :param principal_service: The principal service for authentication.
    :return: A list of MetricDetailType objects.
    """
    ## call exteranl http api
    url = " http://127.0.0.1:8910/list_metrics"
    headers = {
        "Authorization": f"Bearer {principal_service.get_user_id()}"}
    response = requests.get(url, headers=headers)
    # print(f"response {response.status_code} {response.text}")

    result = response.json()

    ## convert to MetricFlowMetric
    metric_list: List[MetricFlowMetric] = []
    for metric in result:
        # noinspection PyArgumentList
        metric = MetricFlowMetric(**metric)
        # print(f"metric {metric}")
        metric_list.append(metric)

    return metric_list


def process_order_by(metric_request:MetricQueryRequest):
    for dimension in metric_request.group_by:
        if dimension.startswith("metric_time__"):
            # if the dimension is metric_time, then we need to order by it
            if metric_request.order:
                if dimension not in metric_request.order:
                    metric_request.order.append(dimension)
            else:
                metric_request.order = [dimension]



def get_metrics_value(metric_name, dimensions: List[MetricDimension], start_time=None, end_time=None):
    metric_request = MetricQueryRequest()
    metric_request.metrics = [metric_name]

    metric_request.group_by = [dimension.qualified_name for dimension in dimensions]
    process_mom_and_yoy(metric_name, metric_request)
    ## if metric_request.group_by have start with metric_time, then use it in order to filter by time
    process_order_by(metric_request)


    print("metric_request", metric_request)

    url = "http://127.0.0.1:8910/query_metrics"
    headers = {'Content-type': 'application/json', 'Accept': 'text/plain'}
    result = requests.post(url, headers=headers, data=metric_request.model_dump_json(exclude_none=True))
    return result.json()


def process_mom_and_yoy(metric_name, metric_request):
    if metric_name.endswith("mom"):
        metric_request.group_by.append("metric_time__month")
        if "metric_time__day" in metric_request.group_by:
            metric_request.group_by.remove("metric_time__day")
    elif metric_name.endswith("yoy"):
        metric_request.group_by.append("metric_time__year")
        if "metric_time__day" in metric_request.group_by:
            metric_request.group_by.remove("metric_time__day")
    else:
        if "metric_time__day" in metric_request.group_by:
            metric_request.group_by.remove("metric_time__day")
            metric_request.group_by.append("metric_time__month")
            # metric_request.group_by.remove("metric_time__year")


if __name__ == "__main__":
    # Example usage
    dimension_list = [
        MetricDimension(name="test", qualified_name="metric_time__day")
    ]

    get_metrics_value("total_underwriting_applications", dimension_list)
    # for metric in metrics:
    #     print(metric.json())
