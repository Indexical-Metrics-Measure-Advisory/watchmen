from fastapi import APIRouter
from fastapi import Depends
from typing import List

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, TopicType
from watchmen_model.common import DataPage, TenantId
from watchmen_rest import get_console_principal
from watchmen_metricflow.util import trans_readonly
from watchmen_utilities import ExtendedBaseModel

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
    return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class TopicWithClassification(ExtendedBaseModel):
    """Topic with dm/datamart classification"""
    topic: Topic
    classification: str  # 'dm' or 'datamart'


class QueryTopicDataPage(DataPage):
    data: List[TopicWithClassification]


def classify_topic(topic: Topic) -> str:
    """
    Classify topic as 'dm' or 'datamart' based on topic name and type
    Logic:
    - If topic name contains 'dm_' or starts with 'dm', classify as 'dm'
    - If topic type is AGGREGATE, RATIO, or TIME, classify as 'datamart'
    - Otherwise, classify as 'datamart' (default)
    """
    if topic.name:
        name_lower = topic.name.lower()
        if 'dm_' in name_lower or name_lower.startswith('dm'):
            return 'dm'
    
    # Check topic type for datamart classification
    if topic.type in [TopicType.AGGREGATE, TopicType.RATIO, TopicType.TIME]:
        return 'datamart'
    
    # Default classification
    return 'datamart'


@router.get('/topics/mart', tags=['CONSOLE', 'ADMIN'], response_model=List[TopicWithClassification])
async def get_topic_list(
        principal_service: PrincipalService = Depends(get_console_principal)
) -> List[TopicWithClassification]:
    """Get all topics with dm/datamart classification"""
    topic_service = get_topic_service(principal_service)
    
    def action() -> List[TopicWithClassification]:
        tenant_id: TenantId = principal_service.get_tenant_id()
        topics = topic_service.find_all(tenant_id)

        ## add filter for classification

        # print(topics)

        
        # Apply classification to each topic
        classified_topics = []
        for topic in topics:
            ## if name start with dm or datamart
            if topic.name and (topic.name.lower().startswith('dm') or 'dm_' in topic.name.lower() or 'datamart' in topic.name.lower()):
                classification = classify_topic(topic)
                classified_topics.append(TopicWithClassification(
                topic=topic,
                classification=classification
            ))
            
        return classified_topics
    
    return trans_readonly(topic_service, action)



