from typing import List

from watchmen_ai.hypothesis.meta.business_challenge_service import BusinessChallengeService
from watchmen_ai.hypothesis.meta.hypothesis_service import HypothesisService
from watchmen_ai.hypothesis.utils.unicode_utils import sanitize_object_unicode
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithHypotheses, HypothesisWithMetrics
from watchmen_ai.hypothesis.model.business import BusinessChallenge
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis
from watchmen_ai.hypothesis.model.metrics import MetricDetailType
from watchmen_ai.hypothesis.service.metric_service import load_metrics_from_definition
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans
from watchmen_lineage.utils.utils import trans_readonly
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage


def ask_business_challenge_service(principal_service: PrincipalService) -> BusinessChallengeService:
    return BusinessChallengeService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def ask_hypothesis_service(principal_service: PrincipalService) -> HypothesisService:
    return HypothesisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


async def filter_metric_by_name(metric_name_list: List[str], metrics_list: List[MetricDetailType]) -> List[
    MetricDetailType]:
    """
    Filter the metrics by name.
    :param metric_name_list:
    :param metrics_list:
    :return:
    """
    filtered_metrics: List[MetricDetailType] = []
    for metric_detail in metrics_list:
        if metric_detail.metric.name in metric_name_list:
            filtered_metrics.append(metric_detail)
    return filtered_metrics


async def add_metric_to_hypothesis(hypothesis: Hypothesis,
                                   principal_service: PrincipalService) -> HypothesisWithMetrics:
    metrics_list: List[MetricDetailType] = await load_metrics_from_definition(principal_service)
    metric_detail_list = await  filter_metric_by_name(hypothesis.metrics, metrics_list)
    hypothesis_with_metric: HypothesisWithMetrics = hypothesis
    hypothesis_with_metric.metrics_details = metric_detail_list
    return hypothesis_with_metric


async def load_full_challenge(challenge_id: str,
                              principal_service: PrincipalService) -> BusinessChallengeWithHypotheses:
    """
    Load the full business challenge with all its hypotheses.
    """

    business_challenge_service: BusinessChallengeService = ask_business_challenge_service(principal_service)

    def load_challenge():
        return business_challenge_service.find_by_id(challenge_id)

    business_challenge: BusinessChallenge = trans_readonly(business_challenge_service, load_challenge)

    # print("business_challenge",business_challenge)

    # Load the hypotheses for the business challenge
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)

    def load_hypotheses_by_challenge() -> List[Hypothesis]:
        return hypothesis_service.find_by_challenge_id(challenge_id, principal_service.get_tenant_id())

    hypotheses: List[HypothesisWithMetrics] = trans_readonly(hypothesis_service, load_hypotheses_by_challenge)

    business_challenge_with_hypotheses = BusinessChallengeWithHypotheses(**business_challenge.__dict__)
    business_challenge_with_hypotheses.hypotheses = hypotheses
    return business_challenge_with_hypotheses

async def save_full_challenge(business_challenge_with_hypotheses: BusinessChallengeWithHypotheses,
        principal_service: PrincipalService):
    # Sanitize Unicode characters before saving to database
    business_challenge_with_hypotheses = sanitize_object_unicode(business_challenge_with_hypotheses)

    hypothesis_service = ask_hypothesis_service(principal_service)
    for hypothesis in business_challenge_with_hypotheses["hypotheses"]:

        hypothesis: HypothesisWithMetrics = hypothesis

        action = ask_challenge_with_hypotheses(hypothesis_service, principal_service,
                                               business_challenge_with_hypotheses["id"])
        trans(hypothesis_service,lambda: action(hypothesis))


def ask_challenge_with_hypotheses(
       hypothesis_service, principal_service: PrincipalService, challenge_id: str
) -> callable:

    def action(hypothesis):
        # Sanitize hypothesis data before saving
        hypothesis = sanitize_object_unicode(hypothesis)
        hypothesis = Hypothesis.model_validate(hypothesis)
        hypothesis.businessChallengeId = challenge_id
        hypothesis.tenantId = principal_service.get_tenant_id()
        hypothesis.userId = principal_service.get_user_id()

        db_hypothesis = hypothesis_service.find_by_id(hypothesis.id)
        if db_hypothesis:
            hypothesis_service.update(hypothesis)
        else:
            hypothesis_service.create(hypothesis)
        return hypothesis

    return action


    # Save the business challenge
    # business_challenge = await business_challenge_service.save(business_challenge_with_hypotheses)
