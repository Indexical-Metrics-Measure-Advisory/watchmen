from typing import List

from watchmen_ai.hypothesis.meta.business_challenge_service import BusinessChallengeService
from watchmen_ai.hypothesis.meta.business_problem_service import BusinessProblemService
from watchmen_ai.hypothesis.meta.hypothesis_service import HypothesisService
from watchmen_ai.hypothesis.utils.unicode_utils import sanitize_object_unicode
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems, BusinessProblemWithHypotheses, \
    HypothesisWithMetrics
from watchmen_ai.hypothesis.model.business import BusinessChallenge, BusinessProblem
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis
from watchmen_ai.hypothesis.model.metrics import MetricDetailType
from watchmen_ai.hypothesis.service.metric_service import load_metrics_from_definition
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans
from watchmen_lineage.utils.utils import trans_readonly
from watchmen_meta.common import ask_snowflake_generator, ask_meta_storage


def ask_business_problem_service(principal_service: PrincipalService) -> BusinessProblemService:
    return BusinessProblemService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


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


async def load_full_challenge(challenge_id: str, principal_service: PrincipalService) -> BusinessChallengeWithProblems:
    """
    Load the full business challenge with all its problems and hypotheses.
    """

    business_challenge_service: BusinessChallengeService = ask_business_challenge_service(principal_service)

    def load_challenge():
        return business_challenge_service.find_by_id(challenge_id)

    business_challenge: BusinessChallenge = trans_readonly(business_challenge_service, load_challenge)

    # print("business_challenge",business_challenge)

    business_problem_service: BusinessProblemService = ask_business_problem_service(principal_service)

    # Load the business challenge with its problems and hypotheses
    def load_problems_by_challenge() -> List[BusinessProblem]:
        return business_problem_service.find_by_challenge_id(challenge_id, principal_service.get_tenant_id())

    metrics_list: List[MetricDetailType] = await load_metrics_from_definition(principal_service)

    problems: List[BusinessProblem] = trans_readonly(business_problem_service, load_problems_by_challenge)
    # Load the problems and hypotheses for the business challenge
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)

    problems_with_hypotheses: List[BusinessProblemWithHypotheses] = []

    for problem in problems:
        # Load the hypotheses for each problem

        def load_hypotheses_by_problem() -> List[Hypothesis]:
            return hypothesis_service.find_by_problem_id(problem.id, principal_service.get_tenant_id())

        hypotheses: List[HypothesisWithMetrics] = trans_readonly(hypothesis_service, load_hypotheses_by_problem)

        # Create a new BusinessProblemWithHypotheses object
        # result_hypothesis:List[HypothesisWithMetrics] = []
        # for hypothesis in hypotheses:
        #     # Set the status of the hypothesis
        #     metric_detail_list =  await  filter_metric_by_name(hypothesis.metrics,metrics_list)
        #     hypothesis_with_metrics = HypothesisWithMetrics(
        #         id=hypothesis.id,
        #         title=hypothesis.title,
        #         description=hypothesis.description,
        #         status=hypothesis.status,
        #         confidence=hypothesis.confidence,
        #         metrics=hypothesis.metrics,
        #         businessProblemId=hypothesis.businessProblemId,
        #         relatedHypothesesIds=hypothesis.relatedHypothesesIds,
        #         metrics_details = metric_detail_list
        #     )
        #     result_hypothesis.append(hypothesis_with_metrics)

        # Add the hypotheses to the problem
        problem_with_hypotheses: BusinessProblemWithHypotheses = BusinessProblemWithHypotheses(
            id=problem.id,
            title=problem.title,
            description=problem.description,
            status=problem.status,
            hypotheses=hypotheses
        )

        problems_with_hypotheses.append(problem_with_hypotheses)

    business_challenge_with_problems = BusinessChallengeWithProblems(**business_challenge.__dict__)
    business_challenge_with_problems.problems = problems_with_hypotheses
    return business_challenge_with_problems

async def save_full_challenge(business_challenge_with_problems: BusinessChallengeWithProblems,
        principal_service: PrincipalService):
    # Sanitize Unicode characters before saving to database
    business_challenge_with_problems = sanitize_object_unicode(business_challenge_with_problems)
    
    problem_service = ask_business_problem_service(principal_service)
    for problem in business_challenge_with_problems["problems"]:

        problem: BusinessProblemWithHypotheses = problem
        problem["businessChallengeId"] = business_challenge_with_problems["id"]
        problem["tenantId"] = principal_service.get_tenant_id()
        problem["userId"] = principal_service.get_user_id()

        action = ask_challenge_with_problems(problem_service,principal_service)
        trans(problem_service,lambda: action(problem))


def get_hypotheses_service(business_problem_service):
    return HypothesisService(
        business_problem_service.storage, business_problem_service.snowflakeGenerator, business_problem_service.principalService)


def ask_challenge_with_problems(
       business_problem_service, principal_service: PrincipalService,
) -> callable:

    def action(problem):
        # Sanitize problem data before saving
        problem = sanitize_object_unicode(problem)
        problem = BusinessProblem.model_validate(problem)
        db_problem = business_problem_service.find_by_id(problem.id)
        if db_problem:
            business_problem_service.update(problem)
        else:
            business_problem_service.create(problem)

        for hypothesis in problem.hypotheses:
            hypothesis_service = get_hypotheses_service(business_problem_service)
            # Sanitize hypothesis data before saving
            hypothesis = sanitize_object_unicode(hypothesis)
            hypothesis = Hypothesis.model_validate(hypothesis)
            hypothesis.businessProblemId = problem.id
            hypothesis.tenantId = principal_service.get_tenant_id()
            hypothesis.userId = principal_service.get_user_id()

            db_hypothesis = hypothesis_service.find_by_id(hypothesis.id)
            if db_hypothesis:
                hypothesis_service.update(hypothesis)
            else:
                hypothesis_service.create(hypothesis)
        return problem

    return action


    # Save the business challenge
    # business_challenge = await business_challenge_service.save(business_challenge_with_problems)
