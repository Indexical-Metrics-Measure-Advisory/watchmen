from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field

from watchmen_auth import PrincipalService
from watchmen_meta.admin import TopicService
from watchmen_meta.common import ask_meta_storage, ask_snowflake_generator
from watchmen_model.admin import Topic, Factor, User, UserRole, TopicType, TopicKind
from watchmen_model.common import TenantId, UserId
from watchmen_rest import get_admin_principal, get_console_principal

router = APIRouter()


def get_topic_service(principal_service: PrincipalService) -> TopicService:
    return TopicService(ask_meta_storage(), ask_snowflake_generator(), principal_service)


class CreateTopicModel(BaseModel):
    name: str = Field(..., description="Name of the topic")
    code: str = Field(..., description="Code of the topic")
    type: str = Field("distinct", description="Type of the topic")
    kind: str = Field("business", description="Kind of the topic")


class CreateTopicResponse(BaseModel):
    topicId: str = Field(..., description="ID of the created topic")
    name: str = Field(..., description="Name of the created topic")
    status: str = Field("success", description="Status of the operation")


@router.post('/mcp/data_modeling/create_topic', tags=['mcp'], operation_id="create_topic",
             response_model=CreateTopicResponse,
             description="Create a new data topic (Data Modeling Skill).")
async def create_topic(request: CreateTopicModel,
                       principal_service: PrincipalService = Depends(get_admin_principal)) -> CreateTopicResponse:
    tenant_id = principal_service.get_tenant_id()
    topic_service = get_topic_service(principal_service)

    topic_service.begin_transaction()
    try:
        # Check if exists
        existing_topic = topic_service.find_by_name_and_tenant(request.name, tenant_id)
        if existing_topic:
            raise HTTPException(status_code=409, detail=f"Topic with name {request.name} already exists.")

        topic = Topic(
            name=request.name,
            code=request.code,
            type=TopicType(request.type),
            kind=TopicKind(request.kind),
            tenantId=tenant_id,
            factors=[]
        )
        
        # Generate ID
        topic_service.redress_storable_id(topic)
        
        # Create
        topic_service.create(topic)
        topic_service.commit_transaction()
        
        return CreateTopicResponse(topicId=topic.topicId, name=topic.name)
    except Exception as e:
        topic_service.rollback_transaction()
        raise e


class FactorModel(BaseModel):
    name: str = Field(..., description="Name of the factor")
    type: str = Field("text", description="Type of the factor")
    label: Optional[str] = Field(None, description="Label of the factor")
    description: Optional[str] = Field(None, description="Description of the factor")


class AddFactorsModel(BaseModel):
    topic_name: str = Field(..., description="Name of the topic to add factors to")
    factors: List[FactorModel] = Field(..., description="List of factors to add")


class AddFactorsResponse(BaseModel):
    status: str = Field("success", description="Status of the operation")
    message: str = Field(..., description="Result message")


@router.post('/mcp/data_modeling/add_factors', tags=['mcp'], operation_id="add_factors",
             response_model=AddFactorsResponse,
             description="Add factors to an existing topic.")
async def add_factors(request: AddFactorsModel,
                      principal_service: PrincipalService = Depends(get_admin_principal)) -> AddFactorsResponse:
    tenant_id = principal_service.get_tenant_id()
    topic_service = get_topic_service(principal_service)

    topic_service.begin_transaction()
    try:
        topic = topic_service.find_by_name_and_tenant(request.topic_name, tenant_id)
        if not topic:
            raise HTTPException(status_code=404, detail=f"Topic {request.topic_name} not found.")

        current_factors = topic.factors or []
        new_factors = []

        for f in request.factors:
            factor_obj = Factor(
                name=f.name,
                type=f.type,
                label=f.label,
                description=f.description
            )
            # Factor ID generation might be needed if strictly required, but often factors inside topic don't need global ID, 
            # they are identified by name or index. 
            # However, Factor model usually has factorId.
            # We can generate it manually if needed.
            # topic_service.snowflakeGenerator.next_id()
            factor_obj.factorId = str(topic_service.snowflakeGenerator.next_id())
            new_factors.append(factor_obj)

        # Append
        current_factors.extend(new_factors)
        topic.factors = current_factors

        # Update
        topic_service.update(topic)
        topic_service.commit_transaction()

        return AddFactorsResponse(message=f"Added {len(new_factors)} factors to {request.topic_name}.")
    except Exception as e:
        topic_service.rollback_transaction()
        raise e


class SimpleFactorResponse(BaseModel):
    name: str
    type: str
    label: Optional[str] = None
    description: Optional[str] = None


class TopicStructureResponse(BaseModel):
    name: str
    code: str
    type: str
    factors: List[SimpleFactorResponse]


@router.get('/mcp/data_modeling/list_topic_structures', tags=['mcp'], operation_id="list_topic_structures",
            response_model=List[TopicStructureResponse],
            description="Get existing topic structures (name, code, factors).")
async def list_topic_structures(
        principal_service: PrincipalService = Depends(get_console_principal)) -> List[TopicStructureResponse]:
    tenant_id = principal_service.get_tenant_id()
    topic_service = get_topic_service(principal_service)

    topic_service.begin_transaction()
    try:
        topics = topic_service.find_all(tenant_id)
        
        result = []
        for t in topics:
            factors = []
            for f in (t.factors or []):
                factors.append(SimpleFactorResponse(
                    name=f.name,
                    type=f.type,
                    label=f.label,
                    description=f.description
                ))
            
            result.append(TopicStructureResponse(
                name=t.name,
                code=t.code,
                type=t.type,
                factors=factors
            ))

        return result
    finally:
        topic_service.close_transaction()
