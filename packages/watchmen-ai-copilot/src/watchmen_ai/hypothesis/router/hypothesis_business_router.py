from logging import getLogger

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from watchmen_ai.hypothesis.meta.analysis_meta_service import AnalysisService
from watchmen_ai.hypothesis.meta.business_challenge_service import BusinessChallengeService
from watchmen_ai.hypothesis.meta.hypothesis_service import HypothesisService
from watchmen_ai.hypothesis.model.analysis import BusinessChallengeWithHypotheses
from watchmen_ai.hypothesis.model.business import BusinessChallenge
from watchmen_ai.hypothesis.model.hypothesis import Hypothesis, HypothesisContext, HypothesisStatus
from watchmen_ai.hypothesis.model.metrics import EmulativeAnalysisMethod
from watchmen_ai.hypothesis.service.ai_service import generate_hypothesis_by_ai, draft_hypothesis_by_ai
from watchmen_ai.hypothesis.service.challenge_service import add_metric_to_hypothesis, load_full_challenge
from watchmen_ai.hypothesis.service.hypothesis_service import suggest_analysis_method
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans, trans_readonly
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_rest import get_any_principal

router = APIRouter()

logger = getLogger(__name__)


class GenerateHypothesisRequest(BaseModel):
    challengeId: str


def ask_business_challenge_service(principal_service: PrincipalService) -> BusinessChallengeService:
    return BusinessChallengeService(ask_meta_storage(), ask_snowflake_generator(),principal_service)


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



@router.get("/challenges/{challenge_id}/hypotheses", tags=["hypothesis"],response_model=None)
async def get_hypotheses_by_challenge_id(challenge_id: str,
                                 principal_service: PrincipalService = Depends(get_any_principal)):
    # Get all hypotheses for the given challenge ID
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)
    def action():
        return hypothesis_service.find_by_challenge_id(challenge_id)

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

    # a hypothesis can only be marked as validated/rejected after an analysis run produced a validation record
    if hypothesis.status in (HypothesisStatus.VALIDATED, HypothesisStatus.REJECTED):
        analysis_service = AnalysisService(ask_meta_storage(), ask_snowflake_generator(), principal_service)

        def load_analysis_records():
            return analysis_service.find_by_hypothesis_id(hypothesis.id, principal_service.get_tenant_id())

        analysis_records = trans_readonly(analysis_service, load_analysis_records)
        if analysis_records is None or len(analysis_records) == 0:
            raise HTTPException(status_code=400,
                                detail='Hypothesis must be validated by running analysis first')

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


@router.delete("/hypothesis/{hypothesis_id}", tags=["hypothesis"], response_model=None)
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
        body: GenerateHypothesisRequest,
        principal_service: PrincipalService = Depends(get_any_principal)
):
    # Get the business challenge by ID
    hypothesis_service: HypothesisService = ask_hypothesis_service(principal_service)
    business_challenge_service: BusinessChallengeService = ask_business_challenge_service(principal_service)


    def read_challenge():
        return business_challenge_service.find_by_id(body.challengeId)

    business_challenge:BusinessChallenge = trans_readonly(business_challenge_service, read_challenge)

    def read_hypotheses():
        return hypothesis_service.find_by_challenge_id(body.challengeId)
    # Get the hypotheses for the given challenge ID
    hypotheses = trans_readonly(hypothesis_service,read_hypotheses)

    return await generate_hypothesis_by_ai(business_challenge,hypotheses)


@router.post("/ai/draft-hypothesis", tags=["hypothesis"], response_model=None)
async def draft_hypothesis(body: HypothesisContext, principal_service: PrincipalService = Depends(get_any_principal)):
    """
    Draft a hypothesis (title, description, analysis method) from a chart/alert/chat context using AI.
    LLM errors are returned as a failure payload instead of raising.
    """
    try:
        result = await draft_hypothesis_by_ai(body)

        # normalize the analysis method to one of the EmulativeAnalysisMethod values
        analysis_method = str(getattr(result, 'analysisMethod', '') or '')
        normalized_method = next(
            (method.value for method in EmulativeAnalysisMethod
             if method.value.lower() == analysis_method.strip().lower()),
            analysis_method)

        return {
            "success": True,
            "title": str(getattr(result, 'title', '') or ''),
            "description": str(getattr(result, 'description', '') or ''),
            "analysisMethod": normalized_method
        }
    except Exception as e:
        logger.error(f"Failed to draft hypothesis by AI: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }





@router.get("/challenge/full/{challenge_id}", tags=["hypothesis"],response_model=None)
async def load_full_challenge_by_id(challenge_id: str, principal_service: PrincipalService = Depends(get_any_principal)):
    """
    Load a full challenge by its ID, including associated hypotheses.
    """
    challenge_with_hypotheses: BusinessChallengeWithHypotheses = await load_full_challenge(challenge_id, principal_service)
    return challenge_with_hypotheses
