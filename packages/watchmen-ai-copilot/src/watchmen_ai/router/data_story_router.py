from typing import List

from fastapi import APIRouter, Depends
from icecream import ic
from pydantic import BaseModel

from watchmen_ai.dspy.model.data_story import DataStory, BusinessTarget, SubQuestion, SubQuestionForDspy, \
    DataStoryStatus, Hypothesis
from watchmen_ai.dspy.module.generate_hypothesis import GenerateHypothesisModule
from watchmen_ai.dspy.module.generate_sub_question import GenerateSubQuestionModule
from watchmen_ai.dspy.module.metrics_finder import MetricsFinderModule
from watchmen_ai.dspy.module.suggestion_subject_dataset import SuggestionsDatasetModule, SuggestionsDatasetResult, \
    DatasetResult
from watchmen_ai.meta.data_story_service import DataStoryService
from watchmen_ai.service.connected_space_service import find_all_subject
from watchmen_ai.service.data_story_service import convert_subject_mata_to_markdown_table_format, MarkdownSubject
from watchmen_ai.utils.utils import clean_space
from watchmen_auth import PrincipalService
from watchmen_indicator_surface.util import trans_readonly, trans
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_meta.console import ConnectedSpaceService, SubjectService
from watchmen_rest import get_any_principal

router = APIRouter()


class DataSetResultWithMarkdownTable(DatasetResult):
    markdown_table: MarkdownSubject = None


async def load_data_story_service(principal_service: PrincipalService) -> DataStoryService:
    return DataStoryService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


def get_subject_service(connected_space_service: ConnectedSpaceService) -> SubjectService:
    return SubjectService(
        connected_space_service.storage, connected_space_service.snowflakeGenerator,
        connected_space_service.principalService)


@router.get("/load_data_story/", tags=["data_story"])
async def load_data_story_by_document_name(document_name: str,
                                           principal_service: PrincipalService = Depends(get_any_principal)):
    data_story_service: DataStoryService = await load_data_story_service(principal_service)

    def action():
        return data_story_service.find_by_name(document_name, principal_service.tenantId)

    data_story: DataStory = trans_readonly(data_story_service, action)

    return data_story


async def load_data_story_by_id(data_story_id: str, principal_service: PrincipalService):
    data_story_service = await load_data_story_service(principal_service)

    def action():
        return data_story_service.find_by_id(data_story_id)

    return trans_readonly(data_story_service, action)


async def generate_sub_question_for_business_question(business_question):
    generate_sub_question = GenerateSubQuestionModule()
    result = generate_sub_question(business_question.name, business_question.description,business_question.datasets)
    ic(result.response)
    return result


@router.post("/generate_sub_question/", tags=["data_story"])
async def generate_sub_question_for_story(business_target: BusinessTarget,
                                          principal_service: PrincipalService = Depends(get_any_principal)):
    if business_target.name is None:
        raise Exception(" business_target name is required")



    sub_questions: List[SubQuestion] = await generate_sub_question_for_business_question(business_target)

    return sub_questions


class GenerateHypothesisReq(BaseModel):
    business_target: BusinessTarget
    sub_questions: List[SubQuestionForDspy] = []

class SuggestionDataset(BaseModel):
    suggestion_datasets: List[DataSetResultWithMarkdownTable] = []
    all_options: List[MarkdownSubject] = []


@router.post("/generate_hypothesis/", tags=["data_story"])
async def generate_hypothesis_for_sub_question(req: GenerateHypothesisReq,
                                               principal_service: PrincipalService = Depends(get_any_principal)):
    generate_hypothesis = GenerateHypothesisModule()
    sub_question_list: List[SubQuestion] = []
    for sub_question in req.sub_questions:
        sub_question_result = SubQuestion(**sub_question.dict())
        result = generate_hypothesis(sub_question.question, req.business_target.name, req.business_target.datasets)
        ic(result.response)
        sub_question_result.hypothesis = result.response
        sub_question_list.append(sub_question_result)

    return sub_question_list


@router.get("/publish_story/", tags=["data_story"])
async def publish_data_story(data_story_id: str, principal_service: PrincipalService = Depends(get_any_principal)):
    data_story_service: DataStoryService = await load_data_story_service(principal_service)

    def action():
        return data_story_service.find_by_id(data_story_id)

    data_story = trans_readonly(data_story_service, action)

    if data_story.status == DataStoryStatus.DRAFT:
        data_story.status = DataStoryStatus.PUBLISHED

    def update_action():
        data_story_service.update(data_story)

    return trans(data_story_service, update_action)


@router.get("/create_data_story/", tags=["data_story"])
async def create_data_story(business_question: str, principal_service: PrincipalService = Depends(get_any_principal)):
    data_story_service: DataStoryService = await load_data_story_service(principal_service)

    data_story = DataStory()
    data_story.dataStoryId = str(data_story_service.snowflakeGenerator.next_id())
    business_target = BusinessTarget(name=business_question)
    data_story.businessQuestion = business_target
    data_story.documentName = business_question
    data_story.tenantId = principal_service.tenantId

    def action():
        return data_story_service.create(data_story)

    return trans(data_story_service, action)



@router.get("/suggestion_dataset", tags=["data_story"])
async def suggestion_dataset(business_question: str, principal_service: PrincipalService = Depends(get_any_principal)):
    # business_question = data_story.businessQuestion
    subject_list = await find_all_subject(principal_service)
    markdown_dataset_list = []
    for subject in subject_list:
        markdown_subject: MarkdownSubject = await convert_subject_mata_to_markdown_table_format(subject)
        markdown_dataset_list.append(markdown_subject)

    suggestion_dataset = SuggestionsDatasetModule()
    res = suggestion_dataset(business_question=business_question, dataset=markdown_dataset_list)
    suggested_result: SuggestionsDatasetResult = res.response

    result = []
    for dataset in suggested_result.dataset_list:
        for markdown_subject in markdown_dataset_list:
            dataset_name = clean_space(dataset.dataset_name)
            subject_name = clean_space(markdown_subject.subject_name)
            if dataset_name == subject_name:
                result.append(DataSetResultWithMarkdownTable(dataset_name=dataset.dataset_name, reason=dataset.reason,
                                                             markdown_table=markdown_subject))

    return SuggestionDataset(suggestion_datasets=result, all_options=markdown_dataset_list)

#todo implement code
@router.post("/suggestion_objective/", tags=["data_story"])
async def find_suggestion_objective(hypothesis: Hypothesis,
                                    principal_service: PrincipalService = Depends(get_any_principal)):
    # TODO find all dataset for current user and tenant
    dataset = """
    Name	Type	Label	Enumeration	Default Value	Encryption & Mask	Description
    AFYC	NUMBER	AFYC (HKD)			None	
    AFYP	NUMBER	AFYP (HKD)			None	
    application_date	DATETIME	Application Date			None	
    bank_code	ENUM	Bank Code			None	
    branch_code	ENUM	Branch Code			None	
    incentive_programs	ENUM	Incentive Programs			None	
    issue_date	DATETIME	Issue Date			None	
    plan_code	ENUM	Basic Plan Code			None	
    policy_no	TEXT	Policy No.			None	
    policy_status	ENUM	Policy Status			None	
    product_group	ENUM	Product Group			None	
    submission_date	DATETIME	Submission Date			None	
    tr_code	ENUM	TR Code			None	

    """



    # TODO find all metrics for current user and tenant
    metrics = """
    Name | Description
    ----|---
    AFYC | Annualized First Year Commission
    AFYP | Annualized First Year Premium
    policies issued | Number of policies issued
    """

    metrics_finder = MetricsFinderModule()
    res = metrics_finder(hypothesis=hypothesis.hypothesis, evidence=hypothesis.evidence, dataset=dataset,
                         metrics=metrics)

    return res.response


async def confirm_data_mapping(data_story: DataStory,
                               principal_service: PrincipalService = Depends(get_any_principal)):
    # TODO find all metrics for current user and tenant

    # TODO mapping objective and metrics

    # TODO mapping dimension for metrics

    # TODO mapping analysis strategy for visualization metrics

    # TODO mapping dataset for sub_question or hypothesis

    pass


async def ask_data_result_by_hypothesis(hypothesis: Hypothesis,data :List,
                                       principal_service: PrincipalService = Depends(get_any_principal)):


    pass



async  def ask_data_insight_by_question(sub_question: SubQuestion,
                                       principal_service: PrincipalService = Depends(get_any_principal)):
    pass