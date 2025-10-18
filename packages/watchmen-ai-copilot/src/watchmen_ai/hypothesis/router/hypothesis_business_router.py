from logging import getLogger

from fastapi import APIRouter, Depends

from watchmen_ai.hypothesis.meta.business_challenge_service import BusinessChallengeService
from watchmen_ai.hypothesis.meta.business_problem_service import BusinessProblemService
from watchmen_ai.hypothesis.meta.hypothesis_service import HypothesisService
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithProblems
from watchmen_ai.hypothesis.model.business import BusinessChallenge, BusinessProblem
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis
from watchmen_ai.hypothesis.service.ai_service import generate_hypothesis_by_ai, generate_problem_by_ai
from watchmen_ai.hypothesis.service.challenge_service import add_metric_to_hypothesis, load_full_challenge
from watchmen_ai.hypothesis.service.hypothesis_service import suggest_analysis_method
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal

router = APIRouter()

logger = getLogger(__name__)


def ask_business_challenge_service(principal_service: PrincipalService) -> BusinessChallengeService:
    return BusinessChallengeService(ask_meta_storage(), ask_snowflake_generator(),principal_service)

def ask_business_problem_service(principal_service: PrincipalService) -> BusinessProblemService:
    return BusinessProblemService(ask_meta_storage(), ask_snowflake_generator(),principal_service)


def ask_hypothesis_service(principal_service: PrincipalService) -> HypothesisService:
    return HypothesisService(ask_meta_storage(), ask_snowflake_generator(),principal_service)


@router.post("/challenge/create", tags=["hypothesis"])
async def create_challenge(challenge: BusinessChallenge,
                           principal_service: PrincipalService = Depends(get_any_principal)):

    business_challenge_service:BusinessChallengeService = ask_business_challenge_service(principal_service)
    if challenge.id is None:
        challenge.id =str(business_challenge_service.snowflakeGenerator.next_id())
        challenge.userId = principal_service.get_user_id()
        challenge.tenantId = principal_service.get_tenant_id()

    def action():
        return business_challenge_service.create(challenge)

    return trans(business_challenge_service, action)

@router.get("/challenges", tags=["hypothesis"])
async def get_challenges(principal_service: PrincipalService = Depends(get_any_principal)):
    business_challenge_service: BusinessChallengeService = ask_business_challenge_service(principal_service)
    print(principal_service.tenantId)
    def action():
        # Get all challenges for the current tenant
        return business_challenge_service.find_all(principal_service.get_tenant_id())

    return trans_readonly(business_challenge_service, action)



@router.post("/challenge/update", tags=["hypothesis"])
async def update_challenge(challenge: BusinessChallenge,
                           principal_service: PrincipalService = Depends(get_any_principal)):
    business_challenge_service: BusinessChallengeService = ask_business_challenge_service(principal_service)
    def action():
        return business_challenge_service.update(challenge)

    return trans(business_challenge_service, action)



@router.get("/challenge/{challenge_id}", tags=["hypothesis"])
async  def get_challenge_by_id(challenge_id: str,
                             principal_service: PrincipalService = Depends(get_any_principal)):

    business_challenge_service: BusinessChallengeService = ask_business_challenge_service(principal_service)

    def action():
        # Get the challenge by ID for the current tenant
        return business_challenge_service.find_by_id(challenge_id)

    return trans(business_challenge_service, action)





@router.get("/problems", tags=["hypothesis"])
async  def get_problems(
        principal_service: PrincipalService = Depends(get_any_principal)):
    business_problem_service: BusinessProblemService = ask_business_problem_service(principal_service)
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)
    def action():
        # Get all problems for the current tenant
        return business_problem_service.find_all(principal_service.get_tenant_id())
    problems =  trans_readonly(business_problem_service, action)

    def read_hypotheses(problem_id):
        return hypothesis_service.find_by_problem_id(problem_id)

    ## loop problem for load hypothesis and set hypothesis id list to problem
    for problem in problems:

        hypothesis_list = trans_readonly(hypothesis_service, lambda: read_hypotheses(problem.id))

        problem.hypothesisIds = []
        for hypothesis in hypothesis_list:
                problem.hypothesisIds.append(hypothesis.id)

    return  problems



@router.get("/problems/{problem_id}", tags=["hypothesis"])
async def get_problem_by_id(problem_id: str,
                            principal_service: PrincipalService = Depends(get_any_principal)):
    business_problem_service: BusinessProblemService = ask_business_problem_service(principal_service)
    def action():
        return business_problem_service.find_by_id(problem_id)
    return trans(business_problem_service, action)



@router.post("/problem/create", tags=["hypothesis"],response_model=None)
async def create_problem(business_problem: BusinessProblem,
                         principal_service: PrincipalService = Depends(get_any_principal)):

    business_problem_service: BusinessProblemService = ask_business_problem_service(principal_service)
    if business_problem.id is None:
        business_problem.id = str(business_problem_service.snowflakeGenerator.next_id())
        business_problem.userId = principal_service.get_user_id()
        business_problem.tenantId = principal_service.get_tenant_id()

    def action():
        return business_problem_service.create(business_problem)


    return trans(business_problem_service, action)

@router.post("/problem/update", tags=["hypothesis"])
async def update_problem(business_problem: BusinessProblem,
                         principal_service: PrincipalService = Depends(get_any_principal)):
    business_problem_service: BusinessProblemService = ask_business_problem_service(principal_service)
    def action():
        return business_problem_service.update(business_problem)

    return trans(business_problem_service, action)



@router.get("/challenges/{challenge_id}/problems", tags=["hypothesis"],response_model=None)
async def get_problems_by_challenge_id(challenge_id: str,
                                   principal_service: PrincipalService = Depends(get_any_principal)):

    business_problem_service: BusinessProblemService = ask_business_problem_service(principal_service)
    def action():
        return business_problem_service.find_by_challenge_id(challenge_id)

    return trans(business_problem_service, action)


@router.get("/problems/{problem_id}/hypotheses", tags=["hypothesis"],response_model=None)
async def get_hypotheses_by_problem_id(problem_id: str,
                                 principal_service: PrincipalService = Depends(get_any_principal)):
    # Get all hypotheses for the given problem ID
    # This is a placeholder implementation. You need to implement the logic to fetch hypotheses by problem ID.
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)
    def action():
        return hypothesis_service.find_by_problem_id(problem_id)

    return trans(hypothesis_service, action)



@router.get("/hypotheses", tags=["hypothesis"], response_model=None)
async def get_hypotheses(
        principal_service: PrincipalService = Depends(get_any_principal)):
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)
    def action():
        return  hypothesis_service.find_all(principal_service.get_tenant_id())

    return trans(hypothesis_service, action)



@router.get("/hypothesis/{hypothesis_id}", tags=["hypothesis"],response_model=None)
async  def get_hypothesis_by_id(hypothesis_id: str,
                             principal_service: PrincipalService = Depends(get_any_principal)):
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)

    def action():
        return hypothesis_service.find_by_id(hypothesis_id)

    return trans(hypothesis_service, action)



@router.post("/hypothesis/create", tags=["hypothesis"],response_model=None)
async def create_hypothesis(hypothesis: Hypothesis,
                            principal_service: PrincipalService = Depends(get_any_principal)):
    hypothesis_service = ask_hypothesis_service(principal_service)

    if hypothesis.id is None:
        hypothesis.id = str(hypothesis_service.snowflakeGenerator.next_id())
        hypothesis.userId = principal_service.get_user_id()
        hypothesis.tenantId = principal_service.get_tenant_id()

    def action():
        return hypothesis_service.create(hypothesis)



    return trans(hypothesis_service, action)



@router.post("/hypothesis/update", tags=["hypothesis"],response_model=None)
async def update_hypothesis(hypothesis: Hypothesis,
                            principal_service: PrincipalService = Depends(get_any_principal)):



    hypothesis_service = ask_hypothesis_service(principal_service)

    hypothesis = await add_metric_to_hypothesis(hypothesis,principal_service)

    hypothesis = await suggest_analysis_method(hypothesis,"")

    # print("hypothesis",hypothesis.model_dump_json())
    # # hypothesis to json
    # hypothesis_json = jsonable_encoder(hypothesis)
    # return hypothesis

    print(hypothesis)

    def action():
        return  hypothesis_service.update(hypothesis)



    return trans(hypothesis_service, action)



@router.get("/hypothesis/recent", tags=["hypothesis"],response_model=None)
async def find_recent_hypotheses(
        principal_service: PrincipalService = Depends(get_any_principal)):

    hypothesis_service = ask_hypothesis_service(principal_service)

    def action():
        return hypothesis_service.find_list_and_limit(principal_service.get_tenant_id(),3)


    return trans(hypothesis_service, action)


@router.get("/hypothesis/related/{hypothesis_id}", tags=["hypothesis"],response_model=None)
async def delete_hypothesis(hypothesis_id: str,
                            principal_service: PrincipalService = Depends(get_any_principal)):

    hypothesis_service = ask_hypothesis_service(principal_service)
    hypothesis = hypothesis_service.find_by_id(hypothesis_id)
    if hypothesis is None:
        return {"error": "Hypothesis not found"}

    def action():
        # Find the hypothesis by ID
        return hypothesis_service.delete(hypothesis_id)


    return trans(hypothesis_service,action)




@router.post("/ai/generate-hypothesis", tags=["hypothesis"],response_model=None)
async  def  ai_generate_hypothesis(
        business_problem: BusinessProblem,
        principal_service: PrincipalService = Depends(get_any_principal)
):
    # Get the business problem by ID
    # business_problem_service: BusinessProblemService = ask_business_problem_service(principal_service)
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)
    business_challenge_service: BusinessChallengeService = ask_business_challenge_service(principal_service)


    def read_challenge():
        return business_challenge_service.find_by_id(business_problem.businessChallengeId)

    business_challenge:BusinessChallenge = trans_readonly(business_challenge_service, read_challenge)

    def read_hypotheses():
        return hypothesis_service.find_by_problem_id(business_problem.id)
    # Get the hypotheses for the given problem ID
    hypotheses = trans_readonly(hypothesis_service,read_hypotheses)

    return await generate_hypothesis_by_ai(business_challenge,business_problem,hypotheses)



@router.post("/ai/generate-problem", tags=["hypothesis"],response_model=None)
async def generate_problem(challenge:BusinessChallenge,principal_service: PrincipalService = Depends(get_any_principal)):
    business_problem_service: BusinessProblemService = ask_business_problem_service(principal_service)


    def read_problems():
        return business_problem_service.find_by_challenge_id(challenge.id)


    problems = trans_readonly(business_problem_service,read_problems)

    return await generate_problem_by_ai(challenge,problems)





@router.get("/challenge/full/{challenge_id}", tags=["hypothesis"],response_model=None)
async def load_full_challenge_by_id(challenge_id: str, principal_service: PrincipalService = Depends(get_any_principal)):
    """
    Load a full challenge by its ID, including associated problems and hypotheses.
    """
    challenge_with_problems: BusinessChallengeWithProblems = await load_full_challenge(challenge_id, principal_service)
    return challenge_with_problems